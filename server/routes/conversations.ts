import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { EventEmitter } from "events";
import Conversation from "../models/Conversation";
import ChatMessage from "../models/ChatMessage";
import Product from "../models/Product";
import Message from "../models/Message";
import User from "../models/User";
import auth from "../middleware/auth";
import multer from "multer";
import { cloudinary } from "../config/cloudinary";
import Notification from "../models/Notification";
import mongoose from "mongoose";
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

interface AuthRequest extends Request {
  user?: any;
}

// Simple pub/sub for Server-Sent Events per conversation
const conversationEmitters = new Map<string, EventEmitter>();
const getEmitter = (conversationId: string): EventEmitter => {
  let emitter = conversationEmitters.get(conversationId);
  if (!emitter) {
    emitter = new EventEmitter();
    emitter.setMaxListeners(100);
    conversationEmitters.set(conversationId, emitter);
  }
  return emitter;
};

// ==================== REAL-TIME MESSAGE BROADCAST ====================
const broadcastMessage = (conversationId: string, message: any) => {
  const emitter = getEmitter(conversationId);
  emitter.emit("newMessage", message);
};

const broadcastConversationUpdate = (conversationId: string, conversation: any) => {
  const emitter = getEmitter(conversationId);
  emitter.emit("conversationUpdated", conversation);
};

// Complete Trade
router.post("/:conversationId/complete-trade", auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "ผู้ใช้ไม่ได้รับอนุญาต" });
    }
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "conversationId ไม่ถูกต้อง" });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "name email profileImage role")
      .populate("product", "title price images sold sellerId")
      .populate("lastMessage.sender", "name profileImage");

    if (!conversation) {
      return res.status(404).json({ message: "ไม่พบการสนทนา" });
    }
    if (!conversation.isActive || conversation.isCompleted) {
      return res.status(400).json({ message: "การสนทนานี้สิ้นสุดแล้ว" });
    }
    if (!conversation.participants.some((p: any) => p._id.equals(req.user!._id))) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์ใน การสนทนานี้" });
    }
    if (!conversation.product) {
      return res.status(400).json({ message: "การสนทนานี้ไม่เกี่ยวข้องกับสินค้า" });
    }

    // อัปเดตสถานะ conversation
    conversation.isActive = false;
    conversation.isCompleted = true;
    conversation.completedAt = new Date();
    if (!conversation.buyerId) {
      conversation.buyerId = req.user._id;
    }
    await conversation.save();

    // อัปเดต completedTrades สำหรับทั้งสองฝ่าย
    await User.updateMany(
      { _id: { $in: conversation.participants.map((p: any) => p._id) } },
      { $inc: { completedTrades: 1 } }
    );

    // อัปเดต Product.sold
    await Product.findByIdAndUpdate(conversation.product._id, { sold: true });

    // สร้าง Notification สำหรับ Review Request
    const otherUserId = conversation.participants.find((p: any) => !p._id.equals(req.user!._id))?._id;
    if (otherUserId) {
      const notification = new Notification({
        userId: otherUserId,
        title: "คำขอรีวิวการซื้อขาย",
        message: `กรุณาให้คะแนนรีวิวสำหรับการซื้อขายสินค้า "${(conversation.product as any).title}"`,
        type: "info",
        sentBy: req.user._id,
        status: "sent",
        conversationId: conversation._id, // ✅ เพิ่ม conversationId
        productId: conversation.product._id // ✅ เพิ่ม productId
      });
      await notification.save();
    }

    broadcastConversationUpdate(conversationId, conversation);

    res.json({ message: "การซื้อขายเสร็จสิ้น", conversation });
  } catch (error: any) {
    console.error("Complete trade error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดำเนินการซื้อขาย" });
  }
});
// ==================== PRODUCT CONVERSATION ENDPOINTS ====================

// สร้างการสนทนาจาก product
router.post("/product/:productId", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const buyerId = req.user._id;

    // ดึงข้อมูล product
    const product = await Product.findById(productId)
      .populate("user", "name email avatar");

    if (!product) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    // ใช้ field "user" แทน "seller" (ตาม Product model)
    const sellerId = (product.user as any)._id;

    // ตรวจสอบว่าไม่ใช่การสนทนากับตัวเอง
    if (buyerId.toString() === sellerId.toString()) {
      return res.status(400).json({ message: "ไม่สามารถติดต่อสินค้าของตัวเองได้" });
    }

    // ตรวจสอบว่ามีการสนทนาอยู่แล้วหรือไม่
    let conversation = await Conversation.findOne({
      product: productId,
      participants: { $all: [buyerId, sellerId] },
      isActive: true
    })
      .populate("participants", "name email avatar role")
      .populate("product", "title price images sold sellerId")
      .populate("lastMessage.sender", "name avatar");
      
    // ถ้ายังไม่มี ให้สร้างใหม่
    if (!conversation) {
      conversation = new Conversation({
        participants: [buyerId, sellerId],
        product: productId,
        isAdminChat: false,
        isActive: true,
        lastMessage: {
          content: "สวัสดีครับ/ค่ะ สนใจสินค้านี้",
          sender: buyerId,
          createdAt: new Date(),
        }
      });
      await conversation.save();

      // ส่งข้อความเริ่มต้นอัตโนมัติ
      const welcomeMessage = new ChatMessage({
        conversationId: conversation._id,
        sender: buyerId,
        content: "สวัสดีครับ/ค่ะ สนใจสินค้านี้",
        read: false,
        isAdminMessage: false
      });
      await welcomeMessage.save();

      await conversation.populate("participants", "name email avatar role");
      await conversation.populate("product", "title price images sold");
      await conversation.populate("lastMessage.sender", "name avatar");
    }

    res.json({ conversation });
  } catch (error: any) {
    console.error("Create product conversation error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้างการสนทนา" });
  }
});

// ==================== ADMIN CHAT ENDPOINTS ====================

// สร้างหรือดึง admin chat
router.post("/admin-chat", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;
    
    // ตรวจสอบว่าเป็น admin หรือไม่
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    // ใช้ admin user ปัจจุบัน
    const adminUser = req.user;

    // ค้นหา conversation ที่มีระหว่าง admin กับ user
    let conversation = await Conversation.findOne({
      participants: { $all: [adminUser._id, userId] },
      isAdminChat: true,
      isActive: true
    })
      .populate("participants", "name email avatar role")
      .populate("lastMessage.sender", "name avatar");

    // ถ้าไม่มี ให้สร้างใหม่
    if (!conversation) {
      // ดึงข้อมูล user ที่จะคุยด้วย
      const targetUser = await User.findById(userId).select("name email avatar");
      if (!targetUser) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }

      conversation = new Conversation({
        participants: [adminUser._id, userId],
        isAdminChat: true,
        adminId: adminUser._id,
        userId: userId,
        isActive: true,
        lastMessage: {
          content: "สวัสดีครับ/ค่ะ ยินดีให้บริการช่วยเหลือ",
          sender: adminUser._id,
          createdAt: new Date(),
        }
      });
      await conversation.save();
      
      // ส่งข้อความต้อนรับอัตโนมัติ
      const welcomeMessage = new ChatMessage({
        conversationId: conversation._id,
        sender: adminUser._id,
        content: "สวัสดีครับ/ค่ะ ยินดีให้บริการช่วยเหลือ",
        read: false,
        isAdminMessage: true
      });
      await welcomeMessage.save();

      await conversation.populate("participants", "name email avatar role");
      await conversation.populate("lastMessage.sender", "name avatar");

      // Broadcast welcome message
      const welcomeMessageWithSender = await ChatMessage.findById(welcomeMessage._id)
        .populate("sender", "name avatar");
      broadcastMessage(conversation._id.toString(), welcomeMessageWithSender);
    }

    res.json({ conversation });
  } catch (error: any) {
    console.error("Admin chat error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้างแชท" });
  }
});

// ส่งข้อความ admin ไปยัง user
router.post("/:conversationId/admin-messages", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    // ตรวจสอบว่าเป็น admin หรือไม่
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ส่งข้อความ" });
    }

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "ข้อความต้องไม่ว่างเปล่า" });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "name email avatar role");

    if (!conversation) {
      return res.status(404).json({ message: "ไม่พบการสนทนา" });
    }

    if (!conversation.isAdminChat) {
      return res.status(400).json({ message: "นี่ไม่ใช่แชทของผู้ดูแลระบบ" });
    }

    // สร้างข้อความใหม่
    const message = new ChatMessage({
      conversationId,
      sender: req.user._id,
      content: content.trim(),
      read: false,
      isAdminMessage: true
    });

    await message.save();
    await message.populate("sender", "name avatar");

    // อัพเดท last message
    conversation.lastMessage = {
      content: content.trim(),
      sender: req.user._id,
      createdAt: new Date(),
    };

    // เพิ่ม unread count สำหรับ user
    const userId = conversation.userId;
    if (userId) {
      const currentCount = conversation.unreadCount.get(userId.toString()) || 0;
      conversation.unreadCount.set(userId.toString(), currentCount + 1);
    }

    await conversation.save();

    // Broadcast message to all connected clients
    broadcastMessage(conversationId, message);
    broadcastConversationUpdate(conversationId, conversation);

    res.status(201).json(message);
  } catch (error: any) {
    console.error("Send admin message error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่งข้อความ" });
  }
});

// ==================== REAL-TIME STREAMS ====================

// Real-time stream for conversation updates
router.get("/:conversationId/stream", async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const token = (req.query.token as string) || "";
    
    if (!token) {
      // Send proper SSE error message
      res.writeHead(401, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write('event: error\ndata: {"message": "No token provided"}\n\n');
      res.end();
      return;
    }

    let userId = "";
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      userId = decoded.userId || decoded.id;
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      res.writeHead(401, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write('event: error\ndata: {"message": "Invalid token"}\n\n');
      res.end();
      return;
    }

    // Validate membership
    const conversation = await Conversation.findOne({ 
      _id: conversationId, 
      participants: userId, 
      isActive: true 
    });
    
    if (!conversation) {
      res.writeHead(404, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write('event: error\ndata: {"message": "Conversation not found"}\n\n');
      res.end();
      return;
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      'X-Accel-Buffering': 'no',
    });

    const emitter = getEmitter(conversationId);
    
    const sendEvent = (data: any) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (writeError) {
        console.error("Error writing to SSE stream:", writeError);
      }
    };

    // Listen for new messages
    const onNewMessage = (data: any) => {
      sendEvent(data);
    };

    const onConversationUpdate = (data: any) => {
      sendEvent({ type: "conversation", data });
    };

    emitter.on("newMessage", onNewMessage);
    emitter.on("conversationUpdated", onConversationUpdate);

    // Send initial connection message
    sendEvent({ 
      type: "connected", 
      conversationId,
      timestamp: new Date().toISOString(),
      message: "Connected to real-time chat"
    });

    // Send recent messages (last 50 messages)
    try {
      const recentMessages = await ChatMessage.find({ conversationId })
        .populate("sender", "name avatar")
        .sort({ createdAt: -1 })
        .limit(50);
      
      if (recentMessages.length > 0) {
        sendEvent({
          type: "recentMessages",
          messages: recentMessages.reverse() // Reverse to get chronological order
        });
      }
    } catch (dbError) {
      console.error("Error fetching recent messages:", dbError);
    }

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (heartbeatError) {
        console.error("Heartbeat error:", heartbeatError);
        clearInterval(heartbeat);
      }
    }, 25000);

    // Cleanup on connection close
    const cleanup = () => {
      clearInterval(heartbeat);
      emitter.off("newMessage", onNewMessage);
      emitter.off("conversationUpdated", onConversationUpdate);
      console.log(`SSE connection closed for conversation ${conversationId}`);
    };

    req.on("close", cleanup);
    req.on("error", cleanup);
    req.on("end", cleanup);

    console.log(`SSE connection established for conversation ${conversationId}`);

  } catch (err: any) {
    console.error("SSE stream setup error:", err);
    try {
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        });
        res.write('event: error\ndata: {"message": "Stream setup failed"}\n\n');
        res.end();
      }
    } catch (e) {
      console.error("Error sending error response:", e);
    }
  }
});

// Get real-time token for client
router.get("/:conversationId/token", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Create token for real-time connection
    const token = jwt.sign(
      { 
        userId: req.user._id, 
        conversationId,
        type: 'chat'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (err: any) {
    console.error("Token generation error:", err);
    res.status(500).json({ message: "Token generation failed" });
  }
});

// ==================== MESSAGE CONVERSATION ENDPOINTS ====================

// Create or get conversation from message
router.post("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { participantId, messageId } = req.body;
    const currentUserId = req.user._id;

    if (!participantId) {
      return res.status(400).json({ message: "participantId is required" });
    }

    // Check if trying to create conversation with self
    if (currentUserId.toString() === participantId.toString()) {
      return res.status(400).json({ message: "Cannot create conversation with yourself" });
    }

    // Check if conversation already exists between these participants
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, participantId] },
      message: messageId,
      isActive: true
    })
      .populate("participants", "name email avatar role")
      .populate("message", "title")
      .populate("lastMessage.sender", "name avatar");

    // If no conversation exists, create a new one
    if (!conversation) {
      // Verify the message exists if messageId is provided
      if (messageId) {
        const message = await Message.findById(messageId);
        if (!message) {
          return res.status(404).json({ message: "Message not found" });
        }
      }

      conversation = new Conversation({
        participants: [currentUserId, participantId],
        message: messageId,
        isAdminChat: false,
        isActive: true,
        lastMessage: {
          content: "เริ่มการสนทนา",
          sender: currentUserId,
          createdAt: new Date(),
        }
      });

      await conversation.save();

      // Populate the conversation
      await conversation.populate("participants", "name email avatar role");
      await conversation.populate("message", "title");
      await conversation.populate("lastMessage.sender", "name avatar");

      // Create initial welcome message
      const welcomeMessage = new ChatMessage({
        conversationId: conversation._id,
        sender: currentUserId,
        content: "สวัสดีครับ/ค่ะ",
        read: false,
        isAdminMessage: false
      });
      await welcomeMessage.save();
    }

    res.json(conversation);
  } catch (error: any) {
    console.error("Create conversation error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้างการสนทนา" });
  }
});

// ==================== CONVERSATION MANAGEMENT ====================

// Get all conversations for current user
router.get("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
      //isActive: true,//
    })
      .populate("product", "title price images user sold sellerId")
      .populate("message", "title")
      .populate("participants", "name email avatar role")
      .populate("lastMessage.sender", "name avatar")
      .sort({ "lastMessage.createdAt": -1, updatedAt: -1 });

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await ChatMessage.countDocuments({
          conversationId: conv._id,
          sender: { $ne: userId },
          read: false,
        });

        return {
          ...conv.toObject(),
          unreadCount,
        };
      })
    );

    res.status(200).json(conversationsWithUnread);
  } catch (err: any) {
    console.error("Fetch conversations error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Get admin conversations only
router.get("/admin/conversations", auth, async (req: AuthRequest, res: Response) => {
  try {
    // ตรวจสอบว่าเป็น admin หรือไม่
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    const adminId = req.user._id;

    const conversations = await Conversation.find({
      isAdminChat: true,
      isActive: true,
      adminId: adminId
    })
      .populate("participants", "name email avatar role")
      .populate("lastMessage.sender", "name avatar")
      .sort({ "lastMessage.createdAt": -1, updatedAt: -1 });

    // สำหรับ admin conversations เราต้องการแสดงข้อมูลของ user (ไม่ใช่ admin)
    const formattedConversations = conversations.map(conv => {
      const userParticipant = conv.participants.find((p: any) => 
        p._id.toString() !== adminId.toString() && p.role !== 'admin'
      );
      
      return {
        ...conv.toObject(),
        userInfo: userParticipant || conv.participants[0] // Fallback to first participant
      };
    });

    res.status(200).json(formattedConversations);
  } catch (err: any) {
    console.error("Fetch admin conversations error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Get messages for a conversation
router.get("/:conversationId/messages", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Check if user is participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await ChatMessage.find({ conversationId })
      .populate("sender", "name avatar")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err: any) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Send message
router.post("/:conversationId/messages", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const senderId = req.user._id;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Message content is required" });
    }

    // Check if user is participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId,
      isActive: true,
    })
      .populate("participants", "name email avatar role");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Create new message
    const message = new ChatMessage({
      conversationId,
      sender: senderId,
      content: content.trim(),
      read: false,
      isAdminMessage: req.user.role === "admin"
    });

    await message.save();
    await message.populate("sender", "name avatar");

    // Update conversation's last message
    conversation.lastMessage = {
      content: content.trim(),
      sender: senderId,
      createdAt: new Date(),
    };

    // Increment unread count for other participants
    const otherParticipants = conversation.participants.filter(
      (p: any) => p._id.toString() !== senderId.toString()
    );

    otherParticipants.forEach((participant: any) => {
      const currentCount = conversation.unreadCount.get(participant._id.toString()) || 0;
      conversation.unreadCount.set(participant._id.toString(), currentCount + 1);
    });

    await conversation.save();

    // Broadcast message to all connected clients
    broadcastMessage(conversationId, message);
    broadcastConversationUpdate(conversationId, conversation);

    res.status(201).json(message);
  } catch (err: any) {
    console.error("Send message error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Mark messages as read
router.patch("/:conversationId/read", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Check if user is participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Mark all unread messages as read
    await ChatMessage.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    // Reset unread count for this user
    conversation.unreadCount.set(userId.toString(), 0);
    await conversation.save();

    // Broadcast conversation update
    broadcastConversationUpdate(conversationId, conversation);

    res.status(200).json({ message: "Messages marked as read" });
  } catch (err: any) {
    console.error("Mark messages as read error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Upload chat attachment (image/file via Cloudinary)
router.post(
  "/:conversationId/attachments",
  auth,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId } = req.params;
      const senderId = req.user._id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: senderId,
        isActive: true,
      })
        .populate("participants", "name email avatar role");

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Upload to Cloudinary
      const isImage = /^image\//.test(file.mimetype);
      const uploadResult = await cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        isImage
          ? { folder: "chat", resource_type: "image" }
          : { folder: "chat", resource_type: "raw" }
      );

      const url = uploadResult.secure_url;
      if (!url) {
        return res.status(500).json({ message: "Upload failed" });
      }

      // Save as a message with attachment
      const message = new ChatMessage({
        conversationId,
        sender: senderId,
        content: isImage ? "ส่งรูปภาพ" : "ส่งไฟล์",
        read: false,
        messageType: isImage ? "image" : "file",
        attachments: [{
          url: url,
          filename: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size
        }],
        isAdminMessage: req.user.role === "admin"
      });
      await message.save();
      await message.populate("sender", "name avatar");

      conversation.lastMessage = {
        content: isImage ? "ส่งรูปภาพ" : "ส่งไฟล์",
        sender: senderId,
        createdAt: new Date(),
      } as any;

      const otherParticipants = conversation.participants.filter(
        (p: any) => p._id.toString() !== senderId.toString()
      );
      otherParticipants.forEach((participant: any) => {
        const currentCount = conversation.unreadCount.get(participant._id.toString()) || 0;
        conversation.unreadCount.set(participant._id.toString(), currentCount + 1);
      });
      await conversation.save();

      // Broadcast message and conversation update
      broadcastMessage(conversationId, message);
      broadcastConversationUpdate(conversationId, conversation);

      res.status(201).json({ message, url });
    } catch (err: any) {
      console.error("Attachment upload error:", err);
      res.status(500).json({ message: err.message || "Server error" });
    }
  }
);

// Delete conversation (soft delete)
router.delete("/:conversationId", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Soft delete - mark as inactive
    conversation.isActive = false;
    await conversation.save();

    res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (err: any) {
    console.error("Delete conversation error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

export default router;