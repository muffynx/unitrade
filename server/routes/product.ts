import express from 'express';
import jwt from 'jsonwebtoken';
import Product from '../models/Product';
import User from '../models/User';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';
import { cloudinary } from '../config/cloudinary';
import multer from 'multer';
import { UploadApiResponse } from 'cloudinary';
import mongoose from 'mongoose';

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

interface AuthRequest extends Request {
  user?: any;
  files?: Express.Multer.File[];
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

// Helper function to get client IP
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
  }
  return req.ip || 'unknown';
};

// View Cache Mechanism
const viewCache = new Map<string, number>();

// Cleanup routine (runs every 1 hour)
const cleanupViewCache = () => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, timestamp] of viewCache.entries()) {
    if (timestamp < oneHourAgo) {
      viewCache.delete(key);
    }
  }
};
setInterval(cleanupViewCache, 60 * 60 * 1000);

const hasViewed = (key: string): boolean => {
  const timestamp = viewCache.get(key);
  if (!timestamp) return false;
  return Date.now() - timestamp < 30 * 60 * 1000; // 30 minutes threshold
};

const markAsViewed = (key: string): void => {
  viewCache.set(key, Date.now());
};

// GET ALL PRODUCTS
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    const category = req.query.category as string | undefined;
    const q = (req.query.q as string | undefined)?.trim();
    const minPrice = req.query.minPrice as string | undefined;
    const maxPrice = req.query.maxPrice as string | undefined;
    const location = req.query.location as string | undefined;
    const condition = req.query.condition as string | undefined;
    const soldParam = req.query.sold as string | undefined;

    const query: any = {};

    if (userId && userId === 'current') {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
        query.user = decoded.id;
      } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } else if (userId) {
      query.user = userId;
    }

    if (soldParam === 'true') query.sold = true;
    else if (soldParam === 'false') query.sold = false;

    if (category) query.category = category;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (condition) query.condition = condition;

    if (minPrice || maxPrice) {
      const priceQuery: any = {};
      if (minPrice && !isNaN(Number(minPrice))) priceQuery.$gte = Number(minPrice);
      if (maxPrice && !isNaN(Number(maxPrice))) priceQuery.$lte = Number(maxPrice);
      query.price = priceQuery;
    }

    if (q && q.length > 0) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { location: regex }
      ];
    }

    const products = await Product.find(query)
      .populate('user', 'name profileImage email studentId')
      .sort({ createdAt: -1 });

    res.status(200).json(products);
  } catch (err: any) {
    console.error('Fetch products error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Product count
router.get('/count', async (_req: Request, res: Response) => {
  try {
    const totalCount = await Product.countDocuments();
    const availableCount = await Product.countDocuments({ sold: false });
    const soldCount = await Product.countDocuments({ sold: true });
    
    res.json({
      count: totalCount,
      available: availableCount,
      sold: soldCount
    });
  } catch (err: any) {
    console.error('Count products error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unique locations
router.get('/locations', async (_req: Request, res: Response) => {
  try {
    const locations = await Product.distinct('location', { 
      location: { $exists: true, $ne: '' },
      sold: false 
    });
    
    const cleaned = (locations as string[])
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v.length > 0)
      .sort((a, b) => a.localeCompare(b));
    
    res.status(200).json({ locations: cleaned });
  } catch (err: any) {
    console.error('Fetch locations error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// GET PRODUCT BY ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('user', 'name profileImage email studentId');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (err: any) {
    console.error('Fetch product error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ✅ FIXED: VIEW TRACKING - Complete and working version
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    
    console.log('📊 View tracking called for product:', productId);
    
    // 1. Validate ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // 2. Caching Check (to prevent excessive DB writes)
    const userIp = getClientIp(req);
    const uniqueKey = `${userIp}_${productId}`;

    if (hasViewed(uniqueKey)) {
      // Return current views without counting
      const product = await Product.findById(productId).select('views');
      return res.status(200).json({ 
        message: 'Already viewed recently',
        counted: false,
        views: product?.views || 0
      });
    }

    // 3. Increment View Count
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { views: 1 } }, 
      { new: true, select: 'views' }
    );
    
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // 4. Mark as viewed
    markAsViewed(uniqueKey);
    
    console.log('✅ View counted for product:', productId);
    
    return res.status(200).json({ 
      message: 'View counted successfully',
      counted: true,
      views: updatedProduct.views
    });
    
  } catch (err: any) {
    console.error('View tracking error (DB operation failed):', err);
    return res.status(500).json({ 
      message: 'Failed to track view due to a server error'
    });
  }
});

// Create Product
router.post('/create', authMiddleware, upload.array('images', 10), async (req: AuthRequest, res: Response) => {
  try {
    const { title, price, category, description, condition, location } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!title || !price || !category || !description || !condition || !location) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    const imageUrls: string[] = [];
    
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          return res.status(400).json({ message: `Image ${file.originalname} exceeds 10MB` });
        }

        const result: UploadApiResponse = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          {
            folder: 'products',
            resource_type: 'image',
            transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good' }]
          }
        );
        
        if (!result.secure_url) {
          throw new Error(`Failed to upload image ${file.originalname}`);
        }
        
        imageUrls.push(result.secure_url);
      }
    }

    const product = new Product({
      title,
      price: parsedPrice,
      category,
      description,
      condition,
      location,
      images: imageUrls,
      user: req.user._id,
      sellerId: req.user._id,
      views: 0,
      favorites: [],
      sold: false
    });

    await product.save();
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (err: any) {
    console.error('Product creation error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Update Product
router.put('/:id', authMiddleware, upload.array('images', 10), async (req: AuthRequest, res: Response) => {
  try {
    const { title, price, category, description, condition, location, existingImages, imagesToDelete, sold } = req.body;
    const files = req.files as Express.Multer.File[];

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this product' });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    if (sold !== undefined) {
      product.sold = sold === true || sold === 'true';
    }

    let updatedImages: string[] = [];
    try {
      updatedImages = JSON.parse(existingImages || '[]');
    } catch (err) {
      return res.status(400).json({ message: 'Invalid existingImages format' });
    }

    let imagesToDeleteArray: string[] = [];
    try {
      imagesToDeleteArray = JSON.parse(imagesToDelete || '[]');
    } catch (err) {
      return res.status(400).json({ message: 'Invalid imagesToDelete format' });
    }

    if (imagesToDeleteArray.length > 0) {
      for (const imageUrl of imagesToDeleteArray) {
        try {
          const urlParts = imageUrl.split('/');
          const index = urlParts.findIndex(part => part === 'products') + 1;
          const publicId = urlParts.slice(index).join('/').split('.')[0];
          const fullPublicId = `products/${publicId}`;
          await cloudinary.uploader.destroy(fullPublicId, { invalidate: true });
        } catch (err: any) {
          console.error('Error deleting image:', imageUrl, err.message);
        }
      }
    }

    if (files && files.length > 0) {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          return res.status(400).json({ message: `Image ${file.originalname} exceeds 10MB` });
        }
        
        const result: UploadApiResponse = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          {
            folder: 'products',
            resource_type: 'image',
            transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good' }]
          }
        );
        updatedImages.push(result.secure_url);
      }
    }

    if (updatedImages.length > 10) {
      return res.status(400).json({ message: 'Maximum 10 images allowed' });
    }

    product.title = title;
    product.price = parsedPrice;
    product.category = category;
    product.description = description;
    product.condition = condition;
    product.location = location;
    product.images = updatedImages;

    await product.save();
    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (err: any) {
    console.error('Product update error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Mark as Sold
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sold } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this product' });
    }

    product.sold = sold === true || sold === 'true';
    await product.save();
    
    res.status(200).json({ 
      message: `Product ${product.sold ? 'marked as sold' : 'marked as available'} successfully`, 
      product 
    });
  } catch (err: any) {
    console.error('Mark as sold error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Delete Product
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this product' });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          const urlParts = imageUrl.split('/');
          const index = urlParts.findIndex(part => part === 'products') + 1;
          const publicId = urlParts.slice(index).join('/').split('.')[0];
          const fullPublicId = `products/${publicId}`;
          await cloudinary.uploader.destroy(fullPublicId, { invalidate: true });
        } catch (err: any) {
          console.error('Error deleting image:', imageUrl, err.message);
        }
      }
    }

    await Product.deleteOne({ _id: req.params.id });
    
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err: any) {
    console.error('Delete product error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

export default router;