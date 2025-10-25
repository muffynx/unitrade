// server/routes/reviews.ts
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import Review from "../models/Review";
import Conversation from "../models/Conversation";
import Notification from "../models/Notification";
import User from "../models/User"; // ✅ เพิ่ม
import auth from "../middleware/auth";

const router = express.Router();

interface AuthRequest extends Request {
  user?: any;
}

// Submit Review
router.post("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { tradeId, productId, recipientId, rating, comment } = req.body;
    const reviewerId = req.user._id;

    if (!tradeId || !productId || !recipientId || !rating) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!mongoose.Types.ObjectId.isValid(tradeId) || !mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const conversation = await Conversation.findOne({
      _id: tradeId,
      isCompleted: true,
      participants: { $all: [reviewerId, recipientId] },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found or not completed" });
    }

    // ตรวจสอบว่าเคยรีวิวแล้วหรือไม่
    const existingReview = await Review.findOne({
      tradeId,
      reviewerId,
      recipientId,
    });
    if (existingReview) {
      return res.status(400).json({ message: "คุณได้รีวิวการซื้อขายนี้แล้ว" });
    }

    const review = new Review({
      tradeId,
      productId,
      reviewerId,
      recipientId,
      rating,
      comment: comment?.trim() || "",
    });
    await review.save();

    // ✅ อัปเดต averageRating และ reviewCount ใน User
    const reviews = await Review.find({ recipientId });
    const reviewCount = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount || 0;

    await User.findByIdAndUpdate(recipientId, {
      averageRating: parseFloat(averageRating.toFixed(2)),
      reviewCount,
    });

    // สร้าง Notification สำหรับผู้รับรีวิว
    const notification = new Notification({
      userId: recipientId,
      title: "ได้รับรีวิวใหม่",
      message: `คุณได้รับรีวิวสำหรับการซื้อขายสินค้า`,
      type: "success",
      sentBy: reviewerId,
      status: "sent",
      conversationId: tradeId, // ✅ เพิ่ม
      productId, // ✅ เพิ่ม
    });
    await notification.save();

    res.status(201).json({ message: "รีวิวสำเร็จ", review });
  } catch (error: any) {
    console.error("Submit review error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่งรีวิว" });
  }
});

// Get Reviews for a User
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const reviews = await Review.find({ recipientId: userId })
      .populate("reviewerId", "name profileImage")
      .populate("productId", "title images")
      .sort({ createdAt: -1 });

    const reviewCount = reviews.length;
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    res.json({ reviews, averageRating: parseFloat(averageRating.toFixed(2)), reviewCount });
  } catch (error: any) {
    console.error("Fetch reviews error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงรีวิว" });
  }
});

// ✅ เพิ่ม Endpoint: ดึงรีวิวของสินค้า
router.get("/product/:productId", async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const reviews = await Review.find({ productId })
      .populate("reviewerId", "name profileImage")
      .populate("productId", "title images")
      .sort({ createdAt: -1 });

    const reviewCount = reviews.length;
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    res.json({ reviews, averageRating: parseFloat(averageRating.toFixed(2)), reviewCount });
  } catch (error: any) {
    console.error("Fetch product reviews error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงรีวิว" });
  }
});

export default router;