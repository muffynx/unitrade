import express, { Request, Response } from "express";
import User from "../models/User";
import Product from "../models/Product";
import Message from "../models/Message";
import Conversation from "../models/Conversation";
import ChatMessage from "../models/ChatMessage";
import Notification from "../models/Notification";
import { verifyAdmin } from "../middleware/authAdmin";
import auth from "../middleware/auth";

const router = express.Router();

interface AuthRequest extends express.Request {
  user?: any;
}

// Report model (simple in-memory storage for demo - in production use proper DB model)
interface Report {
  _id: string;
  type: 'MESSAGE' | 'CHAT' | 'USER' | 'PRODUCT';
  targetId: string;
  reportedBy: string;
  reportedUser?: string; // Keep the more detailed version
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
}

const reports: Report[] = [];

router.get("/users", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err: any) {
    console.error("admin/users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Delete User
router.delete("/users/:id", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ message: "User deleted successfully" });
  } catch (err: any) {
    console.error("admin/users DELETE error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// ✅ Report User
router.post("/users/:id/report", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: `Report recorded for ${user.name}` });
  } catch (err: any) {
    console.error("admin/users report error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== PRODUCT MANAGEMENT ====================

// ✅ Get All Products
router.get("/products", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const filter: any = {};
    if (userId) filter.user = userId;
    
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email");
    
    res.json(products);
  } catch (err: any) {
    console.error("admin/products error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Delete Product
router.delete("/products/:id", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const product = await Product.findByIdAndDelete(id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    res.json({ message: "Product deleted successfully" });
  } catch (err: any) {
    console.error("admin/products DELETE error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== MESSAGE MANAGEMENT ====================

// ✅ Get All Messages
router.get("/messages", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const messages = await Message.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(messages);
  } catch (error: any) {
    console.error("Admin fetch messages error:", error);
    res.status(500).json({ message: "Server error during message fetch" });
  }
});

// ✅ Delete Message
router.delete("/messages/:id", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const result = await Message.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error: any) {
    console.error("Admin delete message error:", error);
    res.status(500).json({ message: "Server error during message deletion" });
  }
});

// ==================== NOTIFICATION MANAGEMENT (ADMIN) ====================

// ✅ Send Notifications to Multiple Users
router.post("/notifications/send", verifyAdmin, async (req: AuthRequest, res: Response) => {
  try {
    console.log("📨 Sending notifications...");
    console.log("Request body:", req.body);
    console.log("Sent by:", req.user?._id);

    const { userIds, title, message, type } = req.body;
    const sentBy = req.user?._id;

    // Validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      console.error("❌ Invalid userIds");
      return res.status(400).json({ message: "กรุณาเลือกผู้รับอย่างน้อย 1 คน" });
    }

    if (!title || !title.trim()) {
      console.error("❌ Invalid title");
      return res.status(400).json({ message: "กรุณากรอกหัวข้อ" });
    }

    if (!message || !message.trim()) {
      console.error("❌ Invalid message");
      return res.status(400).json({ message: "กรุณากรอกข้อความ" });
    }

    if (!sentBy) {
      console.error("❌ No sentBy user");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate users exist
    const users = await User.find({ _id: { $in: userIds } });
    console.log(`✅ Found ${users.length}/${userIds.length} users`);
    
    if (users.length !== userIds.length) {
      console.error("❌ Some users not found");
      return res.status(400).json({ message: "ไม่พบผู้ใช้บางคน" });
    }

    // Create notifications
    const notifications = userIds.map(userId => ({
      userId,
      title: title.trim(),
      message: message.trim(),
      type: type || "info",
      status: "sent",
      sentBy
    }));

    console.log("📝 Creating notifications:", notifications.length);

    const createdNotifications = await Notification.insertMany(notifications);

    console.log("✅ Notifications created:", createdNotifications.length);

    res.status(201).json({
      message: `ส่งการแจ้งเตือนให้ ${userIds.length} คนสำเร็จ`,
      count: createdNotifications.length,
      notifications: createdNotifications
    });
  } catch (err: any) {
    console.error("❌ Send notifications error:", err);
    res.status(500).json({ 
      message: "เกิดข้อผิดพลาดในการส่งการแจ้งเตือน",
      error: err.message 
    });
  }
});

// ✅ Get All Notifications (Admin View)
router.get("/notifications/all", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const filter: any = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;

    const notifications = await Notification.find(filter)
      .populate("userId", "name email")
      .populate("sentBy", "name email")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (err: any) {
    console.error("Fetch notifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== REPORTS MANAGEMENT ====================

interface Report {
  _id: string;
  type: 'MESSAGE' | 'CHAT' | 'USER' | 'PRODUCT';
  targetId: string;
  reportedBy: string;
  reportedUser?: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
}

router.get("/reports", verifyAdmin, async (req: Request, res: Response) => {
  try {
    // Note: If this were a real production application, you would be fetching this from a database.
    res.json(reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
  } catch (err: any) {
    console.error("Fetch reports error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;