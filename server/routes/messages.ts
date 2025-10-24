
import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import Message from "../models/Message";
import User from "../models/User";
import auth from "../middleware/auth";

const router = express.Router();

interface AuthRequest extends Request {
  user?: any;
}

// In-Memory View Tracking
const viewedMessages = new Map<string, number>();

const hasViewed = (key: string): boolean => {
  const timestamp = viewedMessages.get(key);
  if (!timestamp) return false;
  const thirtyMinutes = 30 * 60 * 1000;
  return Date.now() - timestamp < thirtyMinutes;
};

const markAsViewed = (key: string): void => {
  viewedMessages.set(key, Date.now());
  if (viewedMessages.size > 10000) {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [k, timestamp] of viewedMessages.entries()) {
      if (timestamp < oneHourAgo) {
        viewedMessages.delete(k);
      }
    }
  }
};

const getSessionId = (req: Request): string => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.get("user-agent") || "unknown";
  return `${ip}_${userAgent}`.replace(/[^a-zA-Z0-9]/g, "_");
};

// ✅ GET ALL MESSAGES - UPDATED WITH profileImage
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const category = req.query.category as string;
    const q = req.query.q as string; // เพิ่มตรงนี้
    let query: any = { status: "active" };

    if (userId && userId === "current") {
      const token = req.header("Authorization")?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ message: "No token provided" });

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
          id: string;
        };
        query = { user: decoded.id, status: "active" };
      } catch (jwtError) {
        return res.status(401).json({ message: "Invalid token" });
      }
    } else if (userId) {
      query = { user: userId, status: "active" };
    } else if (category && category !== "All items") {
      query = { category, status: "active" };
    }

    if (q && q.trim() !== "") {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } }
      ];
    }

    // ✅ UPDATED: populate with profileImage instead of avatar
    const messages = await Message.find(query)
      .populate("user", "name profileImage email studentId")
      .populate("likes", "name")
      .populate("comments.user", "name profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(messages);
  } catch (err: any) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// ✅ GET MESSAGE BY ID - UPDATED WITH profileImage
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate("user", "name profileImage email studentId")
      .populate("likes", "name")
      .populate("comments.user", "name profileImage");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // View Tracking
    const sessionId =
      (req.headers["x-session-id"] as string) || getSessionId(req);
    const viewedKey = `viewed_${message._id}_${sessionId}`;

    if (!hasViewed(viewedKey)) {
      message.views += 1;
      await message.save();
      markAsViewed(viewedKey);
      console.log(
        `✅ View counted for message ${message._id} from session ${sessionId}`
      );
    } else {
      console.log(
        `⏭️  View already counted for message ${message._id} from session ${sessionId}`
      );
    }

    res.status(200).json(message);
  } catch (err: any) {
    console.error("Fetch message error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Create Message
router.post("/create", auth, async (req: AuthRequest, res: Response) => {
  const { title, description, category, location, budget, urgency } = req.body;

  if (!title || !description || !category || !location) {
    return res.status(400).json({
      message: "Title, description, category, and location are required",
    });
  }

  try {
    const parsedBudget = budget ? parseFloat(budget) : null;
    if (parsedBudget !== null && (isNaN(parsedBudget) || parsedBudget < 0)) {
      return res.status(400).json({ message: "Invalid budget" });
    }

    const message = new Message({
      title,
      description,
      category,
      location,
      budget: parsedBudget,
      urgency: urgency || "medium",
      user: req.user._id,
      likes: [],
      comments: [],
      views: 0,
    });

    await message.save();
    const populatedMessage = await Message.findById(message._id)
      .populate("user", "name profileImage email studentId");

    res.status(201).json({
      message: "Message created successfully",
      createdMessage: populatedMessage,
    });
  } catch (err: any) {
    console.error("Message creation error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Like/Unlike Message
router.post("/:id/like", auth, async (req: AuthRequest, res: Response) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const userId = req.user._id;
    const likeIndex = message.likes.indexOf(userId);

    if (likeIndex === -1) {
      message.likes.push(userId);
    } else {
      message.likes.splice(likeIndex, 1);
    }

    await message.save();
    res.status(200).json({
      message: likeIndex === -1 ? "Message liked" : "Message unliked",
      likes: message.likes,
    });
  } catch (err: any) {
    console.error("Like message error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Add Comment to Message
router.post("/:id/comment", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Comment text is required" });
    }
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const comment = {
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    };

    message.comments.push(comment);
    await message.save();

    const populatedMessage = await Message.findById(req.params.id)
      .populate("comments.user", "name profileImage");

    res.status(201).json({
      message: "Comment added successfully",
      comments: populatedMessage?.comments,
    });
  } catch (err: any) {
    console.error("Add comment error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Mark Comments as Read
router.patch(
  "/:id/mark-comments-read",
  auth,
  async (req: AuthRequest, res: Response) => {
    try {
      const messageId = req.params.id;
      const userId = req.user._id;

      const message = await Message.findOne({
        _id: messageId,
        user: userId,
      });

      if (!message) {
        return res.status(404).json({
          message: "Message not found or unauthorized",
        });
      }

      message.commentsReadAt = new Date();
      await message.save();

      res.status(200).json({
        message: "Comments marked as read",
        commentsReadAt: message.commentsReadAt,
      });
    } catch (err: any) {
      console.error("Mark comments read error:", err);
      res.status(500).json({ message: err.message || "Server error" });
    }
  }
);

// Update Message
router.put("/:id", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, location, budget, urgency, status } =
      req.body;

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this message" });
    }

    if (title) message.title = title;
    if (description) message.description = description;
    if (category) message.category = category;
    if (location) message.location = location;
    if (budget !== undefined) {
      const parsedBudget = parseFloat(budget);
      if (isNaN(parsedBudget) || parsedBudget < 0) {
        return res.status(400).json({ message: "Invalid budget" });
      }
      message.budget = parsedBudget;
    }
    if (urgency) message.urgency = urgency;
    if (status) message.status = status;

    await message.save();
    const populatedMessage = await Message.findById(req.params.id)
      .populate("user", "name profileImage")
      .populate("likes", "name");

    res.status(200).json({
      message: "Message updated successfully",
      updatedMessage: populatedMessage,
    });
  } catch (err: any) {
    console.error("Message update error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Delete Comment from Message
router.delete(
  "/:id/comment/:commentId",
  auth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, commentId } = req.params;
      const userId = req.user._id;

      const message = await Message.findById(id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      const commentIndex = message.comments.findIndex(
        (comment: any) => comment._id.toString() === commentId
      );

      if (commentIndex === -1) {
        return res.status(404).json({ message: "Comment not found" });
      }

      const comment = message.comments[commentIndex];
      if (
        !comment.user ||
        (comment.user.toString() !== userId.toString() &&
          message.user.toString() !== userId.toString())
      ) {
        return res
          .status(403)
          .json({ message: "Unauthorized to delete this comment" });
      }

      message.comments.splice(commentIndex, 1);
      await message.save();

      res.status(200).json({ message: "Comment deleted successfully" });
    } catch (err: any) {
      console.error("Delete comment error:", err);
      res.status(500).json({ message: err.message || "Server error" });
    }
  }
);


// Delete Message
router.delete("/:id", auth, async (req: AuthRequest, res: Response) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this message" });
    }

    await Message.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: "Message deleted successfully" });
  } catch (err: any) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

export default router;