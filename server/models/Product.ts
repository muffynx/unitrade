import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    condition: { type: String, required: true },
    location: { type: String, required: true },
    images: [{ type: String }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ ย้ายเข้ามาในนี้
    createdAt: { type: Date, default: Date.now },
    views: { type: Number, default: 0 },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    sold: { type: Boolean, default: false },
  },
  {
    timestamps: true, // เพิ่มเพื่อให้มี createdAt และ updatedAt อัตโนมัติ
  }
);

productSchema.index({ sold: 1, createdAt: -1 });
productSchema.index({ user: 1, sold: 1 });

export default mongoose.model("Product", productSchema);
