import express from "express";
import User from "../models/User.js";
import Report from "../models/Report.js";
import Reminder from "../models/Reminder.js";
import { auth } from "../middleware/auth.js";
import mongoose from "mongoose";

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// @route   GET /api/admin/stats
// @desc    Get comprehensive system statistics
// @access  Private (Admin only)
router.get("/stats", auth, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalReports = await Report.countDocuments();
    const totalReminders = await Reminder.countDocuments();

    // Active users (logged in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: thirtyDaysAgo },
    });

    // New users this month
    const firstDayOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: firstDayOfMonth },
    });

    // Reminder status counts
    const reminderStats = {
      pending: await Reminder.countDocuments({ status: "pending" }),
      sent: await Reminder.countDocuments({ status: "sent" }),
      failed: await Reminder.countDocuments({ status: "failed" }),
    };

    // Recent activity (last 30 days)
    const recentActivity = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          scans: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    // Stage distribution
    const stageDistribution = await Report.aggregate([
      {
        $group: {
          _id: "$stage",
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          name: {
            $concat: ["Stage ", { $toString: "$_id" }],
          },
          value: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    // Severity distribution WITH USER DETAILS - FIXED: using 'user' field
    const severityDistribution = await Report.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $group: {
          _id: "$stageLabel",
          value: { $sum: 1 },
          users: {
            $addToSet: {
              $concat: [
                { $ifNull: ["$userDetails.firstName", "Unknown"] },
                " ",
                { $ifNull: ["$userDetails.lastName", "User"] },
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ["$_id", "Unknown"] },
          value: 1,
          users: 1,
        },
      },
      {
        $sort: { name: 1 },
      },
    ]);

    res.json({
      totalUsers,
      totalReports,
      totalReminders,
      activeUsers,
      newUsersThisMonth,
      reminderStats,
      recentActivity: recentActivity.map((item) => ({
        date: item._id,
        scans: item.scans,
      })),
      stageDistribution: stageDistribution.length
        ? stageDistribution
        : [{ name: "No Data", value: 1 }],
      severityDistribution: severityDistribution.length
        ? severityDistribution
        : [{ name: "No Data", value: 1, users: [] }],
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Server error while fetching statistics" });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and search - FIXED: using 'user' field
// @access  Private (Admin only)
router.get("/users", auth, isAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    let query = {};
    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get report counts for each user - FIXED: using 'user' field
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const scanCount = await Report.countDocuments({
          user: user._id,
        });

        return {
          ...user.toObject(),
          name: `${user.firstName} ${user.lastName}`,
          scanCount,
        };
      })
    );

    const total = await User.countDocuments(query);

    res.json({
      data: usersWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Server error while fetching users" });
  }
});

// @route   GET /api/admin/users/:userId/reports - FIXED: using 'user' field
// @desc    Get user's reports
// @access  Private (Admin only)
router.get("/users/:userId/reports", auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const reports = await Report.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ data: reports });
  } catch (error) {
    console.error("Get user reports error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /api/admin/users/:userId/reminders
// @desc    Get user's reminders
// @access  Private (Admin only)
router.get("/users/:userId/reminders", auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // If invalid id, return empty array
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.json({ data: [] });
    }

    const reminders = await Reminder.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ dateTime: -1 })
      .limit(50);

    res.json({ data: reminders });
  } catch (error) {
    console.error("Get user reminders error:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// @route   GET /api/admin/rag/documents
// @desc    Get all RAG documents
// @access  Private (Admin only)
router.get("/rag/documents", auth, isAdmin, async (req, res) => {
  try {
    // Connect to RAG service database
    const ragDb = mongoose.connection.useDb("icare");
    const documentsCol = ragDb.collection("rag_documents");

    const documents = await documentsCol
      .find({})
      .sort({ added_at: -1 })
      .limit(100)
      .toArray();

    const totalDocuments = await documentsCol.countDocuments();
    const totalChunks = documents.reduce(
      (sum, doc) => sum + (doc.chunks || 0),
      0
    );

    res.json({
      documents,
      stats: {
        totalDocuments,
        totalChunks,
        avgChunksPerDoc:
          totalDocuments > 0 ? Math.round(totalChunks / totalDocuments) : 0,
      },
    });
  } catch (error) {
    console.error("Get RAG documents error:", error);
    res
      .status(500)
      .json({ error: "Server error while fetching RAG documents" });
  }
});

// @route   DELETE /api/admin/users/:userId - FIXED: using 'user' field
// @desc    Delete a user
// @access  Private (Admin only)
router.delete("/users/:userId", auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete user's reports - FIXED: using 'user' field
    await Report.deleteMany({ user: userId });

    // Delete user's reminders
    await Reminder.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /api/admin/rag/documents/:docId
// @desc    Delete a RAG document
// @access  Private (Admin only)
router.delete("/rag/documents/:docId", auth, isAdmin, async (req, res) => {
  try {
    const { docId } = req.params;

    // Connect to RAG service database
    const ragDb = mongoose.connection.useDb("icare");
    const documentsCol = ragDb.collection("rag_documents");
    const chunksCol = ragDb.collection("rds_chunks");

    // Try matching by ObjectId first if possible
    let query = {};
    if (mongoose.Types.ObjectId.isValid(docId)) {
      query._id = new mongoose.Types.ObjectId(docId);
    } else {
      // Some RAG systems store string IDs; try string match
      query._id = docId;
    }

    const result = await documentsCol.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Delete associated chunks (try both string and object id for doc_id field)
    const chunkQueries = [];
    chunkQueries.push({ doc_id: docId });
    if (mongoose.Types.ObjectId.isValid(docId)) {
      chunkQueries.push({ doc_id: new mongoose.Types.ObjectId(docId) });
    }

    await chunksCol.deleteMany({ $or: chunkQueries });

    res.json({
      success: true,
      message: "Document and associated chunks deleted successfully",
    });
  } catch (error) {
    console.error("Delete RAG document error:", error);
    res.status(500).json({ error: "Server error while deleting document" });
  }
});

export default router;