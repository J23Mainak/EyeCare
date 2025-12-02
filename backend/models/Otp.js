import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["login", "signup", "admin", "reset"],
    required: true,
  },
  userData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Auto-delete after 10 minutes (600 seconds)
  },
});

// Compound index for faster lookups
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

// Method to check if OTP is expired
otpSchema.methods.isExpired = function () {
  const now = new Date();
  const expiryTime = new Date(this.createdAt.getTime() + 10 * 60 * 1000); // 10 minutes
  return now > expiryTime;
};

// Static method to clean up expired OTPs
otpSchema.statics.cleanupExpired = async function () {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  return await this.deleteMany({ createdAt: { $lt: tenMinutesAgo } });
};

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;