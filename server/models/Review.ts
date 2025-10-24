import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    tradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
reviewSchema.index({ tradeId: 1 });
reviewSchema.index({ productId: 1 });
reviewSchema.index({ reviewerId: 1 });
reviewSchema.index({ recipientId: 1 });

export default mongoose.model("Review", reviewSchema);