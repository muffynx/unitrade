import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose'; 
import User from '../models/User';
import Product from '../models/Product';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';

dotenv.config();
const router = express.Router();

interface AuthRequest extends Request {
  user?: any;
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error in favorites:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
};


// GET /api/favorites - Get all favorite product IDs for the current user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const products = await Product.find({ favorites: req.user._id }).select('_id');
    const favoriteIds = products.map(p => p._id.toString());
    res.status(200).json({ favorites: favoriteIds }); 
  } catch (err: any) {
    // โค้ดส่วนนี้มักไม่เกิด 500 แต่ควรมีการบันทึก log ไว้
    console.error('Fetch favorites error:', err);
    res.status(500).json({ message: err.message || 'Server error fetching favorites' });
  }
});


// POST /api/favorites - เพิ่มสินค้าเข้าสู่รายการโปรด
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { productId } = req.body;
  
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid Product ID format' });
  }

  try {
    // 💡 ใช้ $addToSet: จะเพิ่ม ID เข้าไปใน array ก็ต่อเมื่อ ID นั้นยังไม่อยู่ใน array เท่านั้น
    const result = await Product.updateOne( 
      { _id: productId },
      { $addToSet: { favorites: req.user._id } }
    );
    
    // ตรวจสอบว่า Product มีอยู่จริงหรือไม่
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Product not found' });
    
    // ถ้า modifiedCount เป็น 1 แสดงว่ามีการเพิ่มใหม่
    const message = result.modifiedCount === 1 
        ? 'Added to favorites' 
        : 'Product already favorited';
        
    res.status(200).json({ message });
    
  } catch (err: any) {
    console.error('Add favorite error:', err);
    res.status(500).json({ message: 'Server error: Failed to add favorite.' }); 
  }
});


// DELETE /api/favorites/:id - ลบสินค้าออกจากรายการโปรด
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const productId = req.params.id;
  
  if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid Product ID format' });
  }
  
  try {
    // 💡 ใช้ $pull เพื่อลบ ID ออกจาก array อย่างปลอดภัย
    const result = await Product.updateOne(
      { _id: productId },
      { $pull: { favorites: req.user._id } } 
    );
    
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Product not found' });
    
    // เราถือว่าถ้า matchedCount ไม่เป็น 0 คือสำเร็จ ลบได้หรือไม่ไม่ใช่ปัญหา 500
    res.status(200).json({ message: 'Removed from favorites' });
    
  } catch (err: any) {
    console.error('Remove favorite error:', err);
    res.status(500).json({ message: 'Server error: Failed to remove favorite.' });
  }
});

export default router;