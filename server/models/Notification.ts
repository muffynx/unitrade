import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    title: { 
      type: String, 
      required: true 
    },
    message: { 
      type: String, 
      required: true 
    },
    type: { 
      type: String, 
      enum: ["info", "warning", "success", "error"], 
      default: "info" 
    },
    status: { 
      type: String, 
      enum: ["sent", "read", "pending"], 
      default: "sent" 
    },
    readAt: { 
      type: Date 
    },
    sentBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }, 
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" } 
  },



  {
    timestamps: true,
  }
  
);

// Indexes for better performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ type: 1 });

export default mongoose.model("Notification", notificationSchema);


