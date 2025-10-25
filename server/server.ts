import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import path from "path"; // ⬅️ เพิ่ม import นี้ (จากไฟล์ที่ 2)

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

// ✅ trust proxy (สำหรับ Render / Vercel) (จากไฟล์ที่ 1)
app.set('trust proxy', 1);

// ✅ Security middleware (จากไฟล์ที่ 1)
app.use(helmet());

// ✅ Logger (จากไฟล์ที่ 1)
app.use(morgan("dev"));

// ✅ ปรับ CORS ให้ใช้ whitelist เดียว (จากไฟล์ที่ 1)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://unitrade-rho.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // อนุญาตถ้า origin อยู่ใน whitelist หรือถ้าเป็น undefined (เช่น Postman)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ✅ JSON middleware (จากไฟล์ที่ 1)
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


// ✅ ตรวจสอบ Mongo URI (จากไฟล์ที่ 1)
if (!process.env.MONGODB_URI) {
  console.error("❌ Missing MONGODB_URI in environment variables");
  process.exit(1);
}

// ✅ Connect MongoDB (จากไฟล์ที่ 1)
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ✅ Routes (จากทั้ง 2 ไฟล์)
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

// ✅ Default route (จากไฟล์ที่ 1)
app.get("/", (_req, res) => {
  res.send("<h1>🚀 UniTrade API is running</h1>");
});

// ✅ Global error handler (จากไฟล์ที่ 1)
app.use((err: any, _req: express.Request, res: express.Response, _next: any) => {
  console.error("🔥 Unhandled error:", err);
  // ตรวจสอบถ้าเป็น Error จาก CORS
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS: Access denied" });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

// ✅ Start server (จากไฟล์ที่ 1)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
