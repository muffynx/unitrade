import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    // เพิ่มฟิลด์สำหรับระบุว่าข้อความนี้ส่งจาก admin
    isAdminMessage: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        url: String,
        filename: String,
        fileType: String,
        fileSize: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1 });
chatMessageSchema.index({ read: 1 });
chatMessageSchema.index({ isAdminMessage: 1 });

export default mongoose.model("ChatMessage", chatMessageSchema);