import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Product from '../models/Product';
import Message from '../models/Message';
import Review from '../models/Review'; // ✅ เพิ่มการ import
dotenv.config();
const router = express.Router();

// Setup multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น!'));
    }
  }
});

// Auth Middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'ไม่พบ Token กรุณาเข้าสู่ระบบ' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Token ไม่ถูกต้อง' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token ไม่ถูกต้อง' });
  }
};

// User count
router.get('/count', async (req, res) => {
  try {
    const count = await User.countDocuments({});
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// Active user count
router.get('/active-count', async (req, res) => {
  try {
    const count = await User.countDocuments({ status: "active" });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    
    if (!user.profileImage) {
      user.profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128`;
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    
    if (!user.profileImage) {
      user.profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128`;
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req: any, res: any) => {
  console.log('Profile update request:', {
    userId: req.user._id,
    body: req.body
  });

  try {
    const { name, username, email, phone, university, studentId } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อ' });
    }
    
    if (!username || !username.trim()) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้' });
    }
    
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'กรุณากรอกอีเมล' });
    }

    // Check if username already exists (excluding current user)
    if (username !== req.user.username) {
      const usernameExists = await User.findOne({ 
        username: username.trim(), 
        _id: { $ne: req.user._id } 
      });
      if (usernameExists) {
        return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว' });
      }
    }
    
    // Check if email already exists (excluding current user)
    if (email !== req.user.email) {
      const emailExists = await User.findOne({ 
        email: email.trim(), 
        _id: { $ne: req.user._id } 
      });
      if (emailExists) {
        return res.status(400).json({ message: 'อีเมลนี้มีอยู่ในระบบแล้ว' });
      }
    }
    
    // Check if studentId already exists (excluding current user)
    if (studentId && studentId.trim() && studentId !== req.user.studentId) {
      const studentIdExists = await User.findOne({ 
        studentId: studentId.trim(), 
        _id: { $ne: req.user._id } 
      });
      if (studentIdExists) {
        return res.status(400).json({ message: 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว' });
      }
    }

    // Build update object
    const updateData: any = {
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : '',
      university: university ? university.trim() : ''
    };
    
    if (studentId && studentId.trim()) {
      updateData.studentId = studentId.trim();
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    console.log('Profile updated successfully:', updatedUser);
    res.json({ message: 'อัปเดตโปรไฟล์สำเร็จ', user: updatedUser });
  } catch (error: any) {
    console.error('Update profile error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'studentId') return res.status(400).json({ message: 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว' });
      if (field === 'email') return res.status(400).json({ message: 'อีเมลนี้มีอยู่ในระบบแล้ว' });
      if (field === 'username') return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว' });
    }
    
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์', error: error.message });
  }
});

// Upload profile image
router.put('/profile/image', authenticateToken, upload.single('profileImage'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'กรุณาเลือกไฟล์รูปภาพ' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    // Delete old profile image if exists
    if (user.profileImage && !user.profileImage.includes('ui-avatars.com')) {
      const oldImagePath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update user with new image path
    const imagePath = `/uploads/profiles/${req.file.filename}`;
    user.profileImage = imagePath;
    await user.save();

    const updatedUser = await User.findById(req.user._id).select('-password');
    
    res.json({ 
      message: 'อัปเดตรูปโปรไฟล์สำเร็จ', 
      user: updatedUser 
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์', error: error.message });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req: any, res: any) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    console.log('Password change attempt:', {
      userId: req.user._id,
      hasCurrentPassword: !!currentPassword,
      hasNewPassword: !!newPassword,
      newPasswordLength: newPassword?.length
    });
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
    }
    
    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    // Hash new password manually before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password directly in database to avoid pre-save hook
    await User.findByIdAndUpdate(req.user._id, { 
      password: hashedPassword 
    });
    
    console.log('Password changed successfully for user:', req.user._id);
    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์', error: error.message });
  }
});

// Alternative password change endpoint
router.put('/password', authenticateToken, async (req: any, res: any) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
    }
    
    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    // Hash new password manually before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password directly in database to avoid pre-save hook
    await User.findByIdAndUpdate(req.user._id, { 
      password: hashedPassword 
    });
    
    res.json({ message: 'อัปเดตรหัสผ่านสำเร็จ' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์', error: error.message });
  }
});

// Delete account
router.delete('/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    // Delete user's profile image
    if (user.profileImage && !user.profileImage.includes('ui-avatars.com')) {
      const imagePath = path.join(process.cwd(), user.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete user's products
    await Product.deleteMany({ user: req.user._id });
    
    // Delete user's messages
    await Message.deleteMany({ user: req.user._id });
    
    // Delete the user
    await User.findByIdAndDelete(req.user._id);
    
    res.json({ message: 'ลบบัญชีสำเร็จ' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์', error: error.message });
  }
});

// server/routes/users.ts
router.get('/:id', async (req: any, res: any) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    if (!user.profileImage) {
      user.profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128`;
    }

    const products = await Product.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20);

    const messages = await Message.find({ user: req.params.id, status: 'active' })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      user: {
        ...user.toJSON(),
        averageRating: user.averageRating || 0,
        reviewCount: user.reviewCount || 0
      },
      products,
      messages
      // ❌ ไม่ต้องส่ง reviews แล้ว
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
});


export default router;