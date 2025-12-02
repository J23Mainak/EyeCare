import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OTP from "../models/Otp.js";
import {
  generateOTP,
  sendOTPEmail,
  sendPasswordResetEmail,
} from "../utils/email.js";
import crypto from "crypto";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Get JWT secret
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const FRONT_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.VITE_API_BASE_URL || "http://localhost:5000";

// Helper function to generate JWT token with consistent payload
const generateToken = (user) => {
  const userId = user._id.toString();
  return jwt.sign(
    {
      _id: userId,
      id: userId,
      sub: userId, // For RAG service compatibility (standard JWT field)
      userId: userId, // Additional compatibility
      email: user.email,
      role: user.role,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }

        user = new User({
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          password: await bcrypt.hash(
            crypto.randomBytes(32).toString("hex"),
            10
          ),
          isVerified: true,
          isEmailVerified: true,
          googleId: profile.id,
          lastLogin: new Date(),
        });

        await user.save();
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
// @access  Public
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONT_URL}/auth?error=google_auth_failed`,
  }),
  async (req, res) => {
    try {
      const token = generateToken(req.user);

      res.redirect(`${FRONT_URL}/auth?token=${token}`);
    } catch (error) {
      console.error("Google callback error:", error);
      res.redirect(`${FRONT_URL}/auth?error=authentication_failed`);
    }
  }
);

// @route   POST /api/auth/request-otp
// @desc    Request OTP for login/signup/admin
// @access  Public
router.post("/request-otp", async (req, res) => {
  try {
    const { email, password, type, userData } = req.body;

    if (!email || !type) {
      return res.status(400).json({ error: "Email and type are required" });
    }

    // For login, verify credentials first
    if (type === "login") {
      if (!password) {
        return res
          .status(400)
          .json({ error: "Password is required for login" });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    }

    // For signup, check if user already exists
    if (type === "signup" || type === "admin") {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "User already exists with this email" });
      }
    }

    // Generate OTP
    const otp = generateOTP();

    // Delete any existing OTPs for this email and type
    await OTP.deleteMany({ email: email.toLowerCase(), type });

    const safeUserData = { ...userData };
    // Remove any plaintext password from the object before saving
    if (safeUserData && safeUserData.password) {
      delete safeUserData.password;
    }

    // Save OTP to database (no sensitive password field)
    const otpDoc = new OTP({
      email: email.toLowerCase(),
      otp,
      type,
      userData: safeUserData || null,
    });
    await otpDoc.save();

    // Send OTP email
    await sendOTPEmail(email, otp, type);

    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Request OTP error:", error);
    res.status(500).json({ error: error.message || "Failed to send OTP" });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and complete authentication
// @access  Public
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, type, userData } = req.body;

    if (!email || !otp || !type) {
      return res
        .status(400)
        .json({ error: "Email, OTP, and type are required" });
    }

    // Find OTP document
    const otpDoc = await OTP.findOne({
      email: email.toLowerCase(),
      type,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res.status(400).json({ error: "OTP not found or expired" });
    }

    // Check if expired
    if (otpDoc.isExpired()) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ error: "OTP has expired" });
    }

    // Check attempts
    if (otpDoc.attempts >= 5) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ error: "Too many failed attempts" });
    }

    // Verify OTP
    if (otpDoc.otp !== otp) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({
        error: "Invalid OTP",
        attemptsLeft: 5 - otpDoc.attempts,
      });
    }

    let user;
    let message = "Verification successful";

    // Handle based on type
    if (type === "login") {
      user = await User.findOne({ email: email.toLowerCase() });
      user.lastLogin = new Date();
      await user.save();
      message = "Login successful";
    } else if (type === "signup") {
      // ensure userData exists and contains password
      if (!userData || !userData.password) {
        return res.status(400).json({ error: "Missing user information" });
      }
      user = new User({
        email: email.toLowerCase(),
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        isVerified: true,
        isEmailVerified: true,
        role: "user",
        lastLogin: new Date(),
      });
      await user.save();
      message = "Registration successful";
    } else if (type === "admin") {
      if (userData.secretKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ error: "Invalid admin secret key" });
      }

      user = new User({
        email: email.toLowerCase(),
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        isVerified: true,
        isEmailVerified: true,
        role: "admin",
        lastLogin: new Date(),
      });
      await user.save();
      message = "Admin registration successful";
    }

    // Delete OTP after successful verification
    await OTP.deleteOne({ _id: otpDoc._id });

    // Generate JWT token with consistent payload
    const token = generateToken(user);

    res.json({
      success: true,
      message,
      token,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ error: error.message || "Verification failed" });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -resetPasswordToken -resetPasswordExpires"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        gender: user.gender,
        address: user.address,
        isEmailVerified: user.isEmailVerified || user.isVerified,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({
        success: true,
        message:
          "If an account exists, you will receive a password reset email",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetLink = `${FRONT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(
      email
    )}`;

    try {
      await sendPasswordResetEmail(email, resetLink);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(500).json({
        error:
          "Failed to send password reset email. Please try again in a few moments.",
      });
    }

    res.json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to send reset email" });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message:
        "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to reset password" });
  }
});

// @route   POST /api/auth/verify-reset-token
// @desc    Verify if reset token is valid
// @access  Public
router.post("/verify-reset-token", async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: "Email and token are required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    res.json({
      success: true,
      message: "Token is valid",
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    res.status(500).json({ error: "Failed to verify token" });
  }
});

export default router;
