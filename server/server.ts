// server/server.ts
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/product';
import favoritesRoutes from './routes/favorites';
import cartRoutes from './routes/cart';
import userRoutes from './routes/users';
import messageRoutes from './routes/messages';
import conversationRoutes from './routes/conversations';
import reportRoutes from './routes/reports';
import adminRoutes from "./routes/admin";
import notificationRoutes from './routes/Notification';
import reviewRoutes from './routes/reviews';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ ต้องตั้งค่า trust proxy ก่อน middleware อื่นๆ
app.set('trust proxy', true);

// Middleware
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true 
}));
app.use(express.json());

// MongoDB Connection
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined');
}
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/product', productRoutes);
app.use('/api/products', productRoutes); // ใช้ route เดียวกัน
app.use('/api/favorites', favoritesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user', userRoutes); // ใช้ route เดียวกัน
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

app.get('/', (_req, res) => {
  res.send('<h1>UniTrade API is running</h1>');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));