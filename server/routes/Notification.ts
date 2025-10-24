// backend/routes/notifications.ts

import express, { Response } from "express";
import Notification from "../models/Notification";
import auth from "../middleware/auth";

const router = express.Router();

interface AuthRequest extends express.Request {
  user?: any;
}

// ==================== USER NOTIFICATION ENDPOINTS ====================

// ✅ Get User's Notifications
router.get("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("🔔 Fetching notifications for user:", userId);

    const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;
    
    const filter: any = { userId };
    if (unreadOnly === 'true') {
      filter.status = { $ne: 'read' };
    }

    console.log("🔍 Filter:", filter);

    const notifications = await Notification.find(filter)
      .populate("sentBy", "name email")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      userId, 
      status: { $ne: 'read' } 
    });

    console.log("📊 Found:", notifications.length, "notifications, unread:", unreadCount);

    res.json({
      notifications,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total,
      unreadCount
    });
  } catch (err: any) {
    console.error("❌ Fetch user notifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get Unread Count Only
router.get("/unread-count", auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const unreadCount = await Notification.countDocuments({ 
      userId, 
      status: { $ne: 'read' } 
    });

    res.json({ unreadCount });
  } catch (err: any) {
    console.error("❌ Get unread count error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Mark Notification as Read
router.patch("/:notificationId/read", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("📖 Marking notification as read:", notificationId);

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { 
        status: "read", 
        readAt: new Date() 
      },
      { new: true }
    ).populate("sentBy", "name email");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    console.log("✅ Notification marked as read");

    res.json({ 
      message: "Notification marked as read", 
      notification 
    });
  } catch (err: any) {
    console.error("❌ Mark notification as read error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Mark All as Read
router.patch("/mark-all-read", auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("📖 Marking all notifications as read for user:", userId);

    const result = await Notification.updateMany(
      { userId, status: { $ne: 'read' } },
      { 
        status: "read", 
        readAt: new Date() 
      }
    );

    console.log("✅ Marked", result.modifiedCount, "notifications as read");

    res.json({ 
      message: "All notifications marked as read",
      count: result.modifiedCount
    });
  } catch (err: any) {
    console.error("❌ Mark all as read error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Delete Notification
router.delete("/:notificationId", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted successfully" });
  } catch (err: any) {
    console.error("❌ Delete notification error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Submit Report (ย้ายมาจาก admin.ts)
router.post("/reports", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, targetId, reportedUser, reason, description } = req.body;
    const reportedBy = req.user?._id;
    
    if (!type || !targetId || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // TODO: บันทึกลง Database แทน in-memory
    const report = {
      _id: Date.now().toString(),
      type,
      targetId,
      reportedBy,
      reportedUser: reportedUser || undefined,
      reason,
      description: description || '',
      status: 'pending' as const,
      createdAt: new Date()
    };

    console.log("📝 Report submitted:", report);
    
    res.status(201).json({ 
      message: "Report submitted successfully", 
      reportId: report._id 
    });
  } catch (err: any) {
    console.error("❌ Submit report error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;