import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import User from '../models/User';
import auth from '../middleware/auth';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ✅ Helper function: สร้าง secure random password
const generateSecurePassword = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// ✅ Helper function: สร้าง unique student ID
const generateUniqueStudentId = async (): Promise<string> => {
  let studentId: string = '';
  let exists = true;
  
  while (exists) {
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    studentId = `GOOGLE_${randomPart}`;
    const existingUser = await User.findOne({ studentId });
    exists = !!existingUser;
  }
  
  return studentId;
};

// ✅ Helper function: สร้าง unique username
const generateUniqueUsername = async (email: string, name: string): Promise<string> => {
  // สร้าง base username จาก email หรือ name
  let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (!baseUsername || baseUsername.length < 3) {
    baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
  }
  
  let username = baseUsername;
  let counter = 1;
  
  // ตรวจสอบว่า username ซ้ำหรือไม่
  while (await User.findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  return username;
};

// ✅ Verify Google Token with enhanced security
const verifyGoogleToken = async (token: string) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    if (!payload) {
      throw new Error('Token payload ไม่ถูกต้อง');
    }

    // ตรวจสอบเพิ่มเติม
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Audience ไม่ถูกต้อง');
    }

    if (!payload.email_verified) {
      throw new Error('อีเมลยังไม่ได้รับการยืนยันจาก Google');
    }

    // ตรวจสอบ issuer
    if (payload.iss !== 'accounts.google.com' && 
        payload.iss !== 'https://accounts.google.com') {
      throw new Error('Issuer ไม่ถูกต้อง');
    }

    // ตรวจสอบ expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token หมดอายุแล้ว');
    }

    return payload;
  } catch (error) {
    console.error('Google token verification failed:', error);
    throw error;
  }
};

// ✅ Register
router.post('/register', async (req, res) => {
  const { name, email, studentId, password, username } = req.body;

  // Input validation
  if (!name || !email || !studentId || !password) {
    return res.status(400).json({ 
      message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      field: !name ? 'name' : !email ? 'email' : !studentId ? 'studentId' : 'password'
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      message: 'รูปแบบอีเมลไม่ถูกต้อง',
      field: 'email'
    });
  }

  // Password strength validation
  if (password.length < 6) {
    return res.status(400).json({ 
      message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
      field: 'password'
    });
  }

  try {
    // ตรวจสอบ email, studentId, username ซ้ำ
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase().trim() }, 
        { studentId: studentId.trim() },
        ...(username ? [{ username: username.trim() }] : [])
      ] 
    });
    
    if (existingUser) {
      if (existingUser.email === email.toLowerCase().trim()) {
        return res.status(400).json({ message: 'อีเมลนี้มีอยู่ในระบบแล้ว', field: 'email' });
      }
      if (existingUser.studentId === studentId.trim()) {
        return res.status(400).json({ message: 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว', field: 'studentId' });
      }
      if (username && existingUser.username === username.trim()) {
        return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว', field: 'username' });
      }
    }

    // สร้าง username ถ้าไม่มี
    const finalUsername = username?.trim() || await generateUniqueUsername(email, name);

    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      studentId: studentId.trim(), 
      username: finalUsername,
      password,
      role: 'user',
      status: 'active',
      isEmailVerified: false
    });
    
    await user.save();

    // สร้าง JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role || 'user' }, 
      process.env.JWT_SECRET as string, 
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      message: 'สร้างบัญชีสำเร็จ',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        username: user.username,
        role: user.role,
        profileImage: user.profileImage
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      let message = 'ข้อมูลนี้มีอยู่ในระบบแล้ว';
      if (field === 'email') message = 'อีเมลนี้มีอยู่ในระบบแล้ว';
      if (field === 'studentId') message = 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว';
      if (field === 'username') message = 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว';
      
      return res.status(400).json({ 
        message,
        field
      });
    }
    
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ Login ปกติ
router.post('/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ 
      message: 'กรุณากรอกข้อมูลการเข้าสู่ระบบและรหัสผ่าน',
      field: !login ? 'login' : 'password'
    });
  }

  try {
    // ค้นหา user ด้วย email, studentId, หรือ username และดึง password field มาด้วย
    const user = await User.findOne({ 
      $or: [
        { email: login.toLowerCase().trim() }, 
        { studentId: login.trim() },
        { username: login.trim() }
      ] 
    }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
        field: 'login'
      });
    }

    // ตรวจสอบว่าเป็น Google user หรือไม่
    if (user.googleId && (!user.password || user.password.length > 100)) {
      return res.status(400).json({ 
        message: 'บัญชีนี้ใช้การเข้าสู่ระบบด้วย Google กรุณาใช้ปุ่ม "เข้าสู่ระบบด้วย Google"',
        field: 'login',
        isGoogleAccount: true
      });
    }

    // ตรวจสอบ password
    let isMatch = false;
    try {
      isMatch = await user.comparePassword(password);
    } catch (compareError) {
      console.error('Password comparison error:', compareError);
      return res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน',
        field: 'password'
      });
    }

    if (!isMatch) {
      return res.status(401).json({ 
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
        field: 'password'
      });
    }

    // Check account status
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        message: 'บัญชีของคุณถูกระงับ กรุณาติดต่อฝ่ายสนับสนุน',
        field: 'account'
      });
    }

    if (user.status === 'deleted') {
      return res.status(403).json({ 
        message: 'บัญชีนี้ถูกลบแล้ว',
        field: 'account'
      });
    }

    // สร้าง JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role || 'user' }, 
      process.env.JWT_SECRET as string, 
      { expiresIn: '7d' }
    );

    // Update last login (ไม่ block response)
    User.findByIdAndUpdate(user._id, { 
      lastLogin: new Date() 
    }).catch(err => console.error('Error updating lastLogin:', err));

    res.json({ 
      token, 
      user: { 
        id: user._id,
        name: user.name, 
        email: user.email, 
        studentId: user.studentId,
        username: user.username,
        role: user.role || 'user',
        profileImage: user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128`
      } 
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ Google Login - Enhanced version
router.post('/google-login', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        message: 'ไม่พบ Google token',
        field: 'token'
      });
    }

    // Verify Google token with enhanced security
    let payload;
    try {
      payload = await verifyGoogleToken(token);
    } catch (verifyError: any) {
      console.error('Google token verification failed:', verifyError);
      return res.status(401).json({ 
        message: 'Google token ไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่อีกครั้ง',
        field: 'google',
        error: verifyError.message
      });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ 
        message: 'Google token payload ไม่ถูกต้อง',
        field: 'google'
      });
    }

    // ตรวจสอบว่า user มีอยู่แล้วหรือไม่
    let user = await User.findOne({ email: payload.email });

    if (!user) {
      // สร้าง user ใหม่ด้วย secure password และ unique student ID
      const securePassword = generateSecurePassword();
      const uniqueStudentId = await generateUniqueStudentId();
      const uniqueUsername = await generateUniqueUsername(payload.email, payload.name || 'Google User');

      user = new User({
        name: payload.name || 'ผู้ใช้ Google',
        email: payload.email,
        password: securePassword,
        googleId: payload.sub,
        profileImage: payload.picture,
        studentId: uniqueStudentId,
        username: uniqueUsername,
        isEmailVerified: true,
        role: 'user',
        status: 'active'
      });

      await user.save();
      console.log('✅ New Google user created:', user.email);
    } else {
      // อัพเดท Google info
      const updates: any = {};

      if (!user.googleId) {
        updates.googleId = payload.sub;
      }

      if (!user.profileImage && payload.picture) {
        updates.profileImage = payload.picture;
      }

      if (!user.isEmailVerified) {
        updates.isEmailVerified = true;
      }

      // Check account status
      if (user.status === 'suspended') {
        return res.status(403).json({ 
          message: 'บัญชีของคุณถูกระงับ กรุณาติดต่อฝ่ายสนับสนุน',
          field: 'account'
        });
      }

      if (user.status === 'deleted') {
        return res.status(403).json({ 
          message: 'บัญชีนี้ถูกลบแล้ว',
          field: 'account'
        });
      }

      // Update lastLogin
      updates.lastLogin = new Date();

      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(user._id, updates);
        console.log('✅ Updated existing user with Google info:', user.email);
        // Refresh user data
        user = await User.findById(user._id);
      }
    }

    // Create JWT token
    const jwtToken = jwt.sign(
      { id: user!._id, role: user!.role || 'user' },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user!._id,
        name: user!.name,
        email: user!.email,
        studentId: user!.studentId,
        username: user!.username,
        role: user!.role || 'user',
        profileImage: user!.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user!.name)}&background=random&size=128`
      }
    });
  } catch (error: any) {
    console.error('❌ Google login error:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ Get current user
router.get('/me', auth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }
    
    // Set default profile image if not set
    if (!user.profileImage) {
      user.profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128`;
    }
    
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
});

// ✅ Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'ไม่พบ Token' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token ไม่ถูกต้อง' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'บัญชีไม่ได้เปิดใช้งาน' });
    }

    // Set default profile image if not set
    if (!user.profileImage) {
      user.profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128`;
    }

    res.json({ user });
  } catch (error: any) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token ไม่ถูกต้อง' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token หมดอายุแล้ว' });
    }
    
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
});

// ✅ Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'ออกจากระบบสำเร็จ' });
});

export default router;