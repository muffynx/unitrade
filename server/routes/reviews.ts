// server/routes/reviews.ts
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import Review from "../models/Review";
import Conversation from "../models/Conversation";
import Notification from "../models/Notification";
import User from "../models/User";
import auth from "../middleware/auth";

const router = express.Router();

interface AuthRequest extends Request {
  user?: any;
}

// ✅ POST: Submit Review
router.post("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { tradeId, productId, recipientId, rating, comment } = req.body;
    const reviewerId = req.user._id;

    if (!tradeId || !productId || !recipientId || !rating) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ ตรวจสอบ ObjectId ทั้งหมด
    const isValid =
      mongoose.Types.ObjectId.isValid(tradeId) &&
      mongoose.Types.ObjectId.isValid(productId) &&
      mongoose.Types.ObjectId.isValid(recipientId);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // ✅ ตรวจสอบว่ามี conversation ที่จบแล้วหรือไม่
    const conversation = await Conversation.findOne({
      _id: new mongoose.Types.ObjectId(tradeId),
      isCompleted: true,
      participants: { $all: [reviewerId, recipientId] },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found or not completed" });
    }

    // ✅ ตรวจสอบว่าเคยรีวิวแล้วหรือไม่
    const existingReview = await Review.findOne({
      tradeId: new mongoose.Types.ObjectId(tradeId),
      reviewerId: new mongoose.Types.ObjectId(reviewerId),
      recipientId: new mongoose.Types.ObjectId(recipientId),
    });

    if (existingReview) {
      return res.status(400).json({ message: "คุณได้รีวิวการซื้อขายนี้แล้ว" });
    }

    // ✅ บันทึกรีวิวพร้อม ObjectId ทั้งหมด
    const review = new Review({
      tradeId: new mongoose.Types.ObjectId(tradeId),
      productId: new mongoose.Types.ObjectId(productId),
      reviewerId: new mongoose.Types.ObjectId(reviewerId),
      recipientId: new mongoose.Types.ObjectId(recipientId),
      rating,
      comment: comment?.trim() || "",
    });

    await review.save();

    // ✅ คำนวณคะแนนเฉลี่ยใหม่ของ recipient
    const reviews = await Review.find({ recipientId: new mongoose.Types.ObjectId(recipientId) });
    const reviewCount = reviews.length;
    const averageRating = reviewCount
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

    await User.findByIdAndUpdate(recipientId, {
      averageRating: parseFloat(averageRating.toFixed(2)),
      reviewCount,
    });

    // ✅ สร้าง Notification สำหรับผู้รับรีวิว
    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(recipientId),
      title: "ได้รับรีวิวใหม่",
      message: `คุณได้รับรีวิวสำหรับการซื้อขายสินค้า`,
      type: "success",
      sentBy: new mongoose.Types.ObjectId(reviewerId),
      status: "sent",
      conversationId: new mongoose.Types.ObjectId(tradeId),
      productId: new mongoose.Types.ObjectId(productId),
    });

    await notification.save();

    res.status(201).json({ message: "รีวิวสำเร็จ", review });
  } catch (error: any) {
    console.error("Submit review error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่งรีวิว" });
  }
});

// ✅ GET: Reviews ของผู้ใช้
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const reviews = await Review.find({
      recipientId: new mongoose.Types.ObjectId(userId),
    })
      .populate("reviewerId", "name profileImage")
      .populate("productId", "title images")
      .sort({ createdAt: -1 });

    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

    res.json({
      reviews,
      averageRating: parseFloat(averageRating.toFixed(2)),
      reviewCount,
    });
  } catch (error: any) {
    console.error("Fetch reviews error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงรีวิว" });
  }
});

// ✅ GET: Reviews ของสินค้า
router.get("/product/:productId", async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const reviews = await Review.find({
      productId: new mongoose.Types.ObjectId(productId),
    })
      .populate("reviewerId", "name profileImage")
      .populate("productId", "title images")
      .sort({ createdAt: -1 });

    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

    res.json({
      reviews,
      averageRating: parseFloat(averageRating.toFixed(2)),
      reviewCount,
    });
  } catch (error: any) {
    console.error("Fetch product reviews error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงรีวิว" });
  }
});

export default router;
