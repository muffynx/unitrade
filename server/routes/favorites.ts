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


router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const products = await Product.find({ favorites: req.user._id }).select('_id');
    const favoriteIds = products.map(p => p._id.toString());
    res.status(200).json({ favorites: favoriteIds });
  } catch (err: any) {
    console.error('Fetch favorites error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});


router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ message: 'Product ID is required' });

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!product.favorites.includes(req.user._id)) {
      product.favorites.push(req.user._id);
      await product.save();
    }
    res.status(200).json({ message: 'Added to favorites' });
  } catch (err: any) {
    console.error('Add favorite error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});


router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.favorites = product.favorites.filter(id => id.toString() !== req.user._id.toString());
    await product.save();
    res.status(200).json({ message: 'Removed from favorites' });
  } catch (err: any) {
    console.error('Remove favorite error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

export default router;