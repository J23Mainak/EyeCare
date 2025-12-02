import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import doctorRoutes from "./routes/doctors.js";
// import chatRoutes from './routes/chat.js';
import uploadRoutes from "./routes/upload.js";
import reportsRouter from "./routes/reports.js";
import reminderRoutes from "./routes/reminders.js";
import adminRoutes from "./routes/admin.js";
import notificationService from "./notificationService.js";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

console.log("Environment:");
console.log(" NODE_ENV:", process.env.NODE_ENV || "development");
console.log(" PORT:", PORT);
console.log(" MONGODB_URI:", process.env.MONGODB_URI ? "Set" : "Not set");
console.log(" JWT_SECRET_KEY:", process.env.JWT_SECRET_KEY ? "Set" : "Not set");

if (!process.env.MONGODB_URI) {
  console.error(
    "❌ MONGODB_URI not set. Please add it to your .env before starting the server."
  );
}
if (!process.env.JWT_SECRET_KEY) {
  console.warn(
    "⚠️ JWT_SECRET_KEY not set. Sessions will still start but using a missing secret is insecure."
  );
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : [
            "http://localhost:5000",
            "http://localhost:5173",
            "http://localhost:8080",
            "http://localhost:8501",
            "http://localhost:8502",
          ],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session middleware
app.use(
  session({
    secret: process.env.JWT_SECRET_KEY || "dev-secret", // fallback for local dev only
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Initialize Passport (ensure you configure strategies elsewhere)
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting (apply to /api)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Clarity Retina Care API is running",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/doctors", doctorRoutes);
// app.use('/api/chat', chatRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/reports", reportsRouter);
app.use("/api/admin", adminRoutes);

// Error handling middleware (keep this last before 404)
app.use((err, req, res, next) => {
  console.error("Error middleware:", err && err.stack ? err.stack : err);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// DB connect function
async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      // recommended mongoose options if desired; adjust as needed:
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error(
      "❌ MongoDB connection error:",
      error && error.message ? error.message : error
    );
    throw error;
  }
}

// Graceful shutdown helper
async function gracefulShutdown(signal) {
  try {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    // Cancel scheduled jobs if notificationService supports it
    try {
      if (
        notificationService &&
        typeof notificationService.cancelAllScheduled === "function"
      ) {
        console.log("Cancelling all scheduled reminder jobs...");
        notificationService.cancelAllScheduled();
      }
    } catch (e) {
      console.warn(
        "Error while cancelling scheduled jobs:",
        e && e.message ? e.message : e
      );
    }

    // Close mongoose connection
    try {
      if (mongoose.connection.readyState === 1) {
        console.log("Disconnecting from MongoDB...");
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
      }
    } catch (e) {
      console.warn(
        "Error during mongoose.disconnect():",
        e && e.message ? e.message : e
      );
    }

    // allow process to exit
    process.exit(0);
  } catch (err) {
    console.error("Graceful shutdown failed:", err);
    process.exit(1);
  }
}

// Catch unhandled rejections and exceptions, attempt graceful shutdown
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Start server only after DB is connected
(async function startServer() {
  try {
    await connectDB();

    // After DB connection restore pending reminders (run once)
    try {
      if (
        notificationService &&
        typeof notificationService.restorePendingReminders === "function"
      ) {
        console.log("Restoring pending reminders...");
        await notificationService.restorePendingReminders();
      } else {
        console.warn(
          "notificationService.restorePendingReminders() not available"
        );
      }
    } catch (err) {
      console.error(
        "Error restoring pending reminders:",
        err && err.message ? err.message : err
      );
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `📊 Health check available at: http://localhost:${PORT}/api/health`
      );
    });

    // Graceful shutdown: close HTTP server too if needed
    process.on("SIGINT", async () => {
      console.log("SIGINT received - closing HTTP server...");
      server.close(() => {
        console.log("HTTP server closed");
      });
      await gracefulShutdown("SIGINT");
    });
    process.on("SIGTERM", async () => {
      console.log("SIGTERM received - closing HTTP server...");
      server.close(() => {
        console.log("HTTP server closed");
      });
      await gracefulShutdown("SIGTERM");
    });
  } catch (err) {
    console.error(
      "Failed to start server:",
      err && err.message ? err.message : err
    );
    process.exit(1);
  }
})();
