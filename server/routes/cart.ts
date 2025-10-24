import express from 'express';
import jwt from 'jsonwebtoken';
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
    console.error('Auth error:', err);
    res.status(401).json({ message: 'Invalid token' });
  }
};


// router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
//   const { productId } = req.body;
//   if (!productId) return res.status(400).json({ message: 'Product ID is required' });

//   try {
//     const product = await Product.findById(productId);
//     if (!product) return res.status(404).json({ message: 'Product not found' });

//     const user = await User.findById(req.user._id);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Add to user's cart (สมมติ User มี field cart)
//     if (!user.cart) user.cart = [];
//     if (!user.cart.includes(productId)) {
//       user.cart.push(productId);
//       await user.save();
//     }
//     res.status(200).json({ message: 'Added to cart' });
//   } catch (err: any) {
//     console.error('Add to cart error:', err);
//     res.status(500).json({ message: err.message || 'Server error' });
//   }
// });

export default router;