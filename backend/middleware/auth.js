import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Extract user ID - support multiple field names for compatibility
    const userId = decoded._id || decoded.sub || decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({ error: "Invalid token: missing user ID" });
    }

    // Fetch user from database
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({ error: "Invalid token. User not found." });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token." });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired." });
    }
    res.status(500).json({ error: "Server error." });
  }
};

export const adminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(403)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Extract user ID - support multiple field names
    const userId = decoded._id || decoded.sub || decoded.userId || decoded.id;

    if (!userId) {
      return res.status(403).json({ error: "Invalid token: missing user ID" });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(403).json({ error: "Invalid token. User not found." });
    }

    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Access denied. Admin privileges required." });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    res.status(500).json({ error: "Server error." });
  }
};

export const doctorAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(403)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Extract user ID - support multiple field names
    const userId = decoded._id || decoded.sub || decoded.userId || decoded.id;

    if (!userId) {
      return res.status(403).json({ error: "Invalid token: missing user ID" });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(403).json({ error: "Invalid token. User not found." });
    }

    if (user.role !== "doctor" && user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Access denied. Doctor privileges required." });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    console.error("Doctor auth middleware error:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    res.status(500).json({ error: "Server error." });
  }
};
