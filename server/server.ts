// server/server.ts
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

// Routes
import authRoutes from "./routes/auth";
import productRoutes from "./routes/product";
import favoritesRoutes from "./routes/favorites";
import cartRoutes from "./routes/cart";
import userRoutes from "./routes/users";
import messageRoutes from "./routes/messages";
import conversationRoutes from "./routes/conversations";
import reportRoutes from "./routes/reports";
import adminRoutes from "./routes/admin";
import notificationRoutes from "./routes/Notification";
import reviewRoutes from "./routes/reviews";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ✅ ตั้งค่า trust proxy (จำเป็นเมื่ออยู่หลัง proxy เช่น Render หรือ Vercel)
app.set("trust proxy", 1);

// ✅ เพิ่ม security middleware
app.use(helmet());

// ✅ ใช้ morgan log เฉพาะตอน development
if (NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ✅ CORS configuration (รวมทั้ง dev และ production)
const allowedOrigins =
  NODE_ENV === "production"
    ? ["https://unitrade-rho.vercel.app"]
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
      ];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ✅ JSON middleware
app.use(express.json());

// ✅ ตรวจสอบ Mongo URI
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error("❌ Missing MONGODB_URI in environment variables");
  process.exit(1);
}

// ✅ Connect MongoDB
mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/product", productRoutes);
app.use("/api/products", productRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Default route
app.get("/", (_req, res) => {
  res.send(`<h1>🚀 UniTrade API is running in ${NODE_ENV} mode</h1>`);
});

// ✅ Global error handler (optional)
app.use((err: any, _req: express.Request, res: express.Response, _next: any) => {
  console.error("🔥 Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} [${NODE_ENV}]`);
});
