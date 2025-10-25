import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import User from '../models/User';
import auth from '../middleware/auth';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer'; // ✅ 1. Import Nodemailer
import Otp from '../models/Otp'; // ✅ 2. Import Otp Model

dotenv.config();
const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ✅ 3. สร้าง Email Transport (ตัวส่งอีเมล)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // อีเมลจาก .env
    pass: process.env.EMAIL_PASS, // รหัสผ่านแอป 16 ตัวจาก .env
  },
});

// ✅ 4. สร้าง Helper function สำหรับส่งอีเมล
const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    await transporter.sendMail({
      from: `"UniTrade" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      // (คุณสามารถเพิ่ม HTML สวยๆ ได้ที่นี่)
      // html: `<b>${text}</b>`
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw new Error('Failed to send email.');
  }
};


// (Helper functions เดิมของคุณ: generateSecurePassword, generateUniqueStudentId, ...)
const generateSecurePassword = (): string => {
  return crypto.randomBytes(32).toString('hex');
};
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
const generateUniqueUsername = async (email: string, name: string): Promise<string> => {
  let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!baseUsername || baseUsername.length < 3) {
    baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
  }
  let username = baseUsername;
  let counter = 1;
  while (await User.findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  return username;
};
const verifyGoogleToken = async (token: string) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('Token payload ไม่ถูกต้อง');
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('Audience ไม่ถูกต้อง');
    if (!payload.email_verified) throw new Error('อีเมลยังไม่ได้รับการยืนยันจาก Google');
    if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') throw new Error('Issuer ไม่ถูกต้อง');
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) throw new Error('Token หมดอายุแล้ว');
    return payload;
  } catch (error) {
    console.error('Google token verification failed:', error);
    throw error;
  }
};


// ✅ ======================================
// ✅ 5. อัปเดต ROUTE: /send-register-otp
// ✅ ======================================
router.post('/send-register-otp', async (req, res) => {
  const { email } = req.body;
  const lowerEmail = email.toLowerCase().trim();

  if (!email) {
    return res.status(400).json({ message: 'กรุณากรอกอีเมล', field: 'email' });
  }
  if (!lowerEmail.endsWith('@kkumail.com')) {
    return res.status(400).json({ message: 'โปรดใช้อีเมลของมหาวิทยาลัย (@kkumail.com)', field: 'email' });
  }

  try {
    const existingUser = await User.findOne({ email: lowerEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'อีเมลนี้มีอยู่ในระบบแล้ว', field: 'email' });
    }

    // ✅ สร้าง OTP 6 หลักจริงๆ
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // ✅ ลบ OTP เก่าของอีเมลนี้ (ถ้ามี)
    await Otp.deleteMany({ email: lowerEmail });

    // ✅ บันทึก OTP ใหม่ลง DB (จะหมดอายุใน 10 นาที)
    await new Otp({ email: lowerEmail, otp }).save();

    // ✅ ส่งอีเมลจริงๆ
    const subject = 'Your UniTrade Verification Code';
    const text = `Your verification code for UniTrade is: ${otp}\nThis code will expire in 10 minutes.`;
    
    await sendEmail(lowerEmail, subject, text);

    res.status(200).json({ message: 'OTP has been sent to your email.' });
  
  } catch (err: any) {
    console.error('Send OTP error:', err);
    // ถ้าการส่งอีเมลล้มเหลว (เช่น รหัสผ่าน .env ผิด)
    if (err.message === 'Failed to send email.') {
      return res.status(500).json({ message: 'Error sending verification email. Please contact support.' });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
});


// ✅ ======================================
// ✅ 6. อัปเดต ROUTE: /verify-register-otp
// ✅ ======================================
router.post('/verify-register-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'กรุณากรอก OTP' });
  }

  try {
    // ✅ ค้นหา OTP จาก DB ที่ตรงกัน และยังไม่หมดอายุ (เพราะ TTL index)
    const foundOtp = await Otp.findOne({
      email: email.toLowerCase().trim(),
      otp: otp,
    });
    
    if (!foundOtp) {
      // ถ้าไม่พบ = รหัสผิด หรือ หมดอายุไปแล้ว
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
    
    // ✅ ลบ OTP ทิ้งทันทีที่ใช้สำเร็จ
    await Otp.deleteOne({ _id: foundOtp._id });

    res.status(200).json({ message: 'Email verified successfully!' });
  
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
});


// ✅ Register (โค้ดเดิมของคุณ)
router.post('/register', async (req, res) => {
  const { name, email, studentId, password, username } = req.body;

  // (Validations เดิมของคุณ)
  if (!name || !email || !studentId || !password) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  try {
    // (โค้ดเช็ค User ซ้ำ เดิมของคุณ)
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase().trim() }, 
        { studentId: studentId.trim() },
        ...(username ? [{ username: username.trim() }] : [])
      ] 
    });
    if (existingUser) {
      if (existingUser.email === email.toLowerCase().trim()) return res.status(400).json({ message: 'อีเมลนี้มีอยู่ในระบบแล้ว', field: 'email' });
      if (existingUser.studentId === studentId.trim()) return res.status(400).json({ message: 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว', field: 'studentId' });
      if (username && existingUser.username === username.trim()) return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว', field: 'username' });
    }

    const finalUsername = username?.trim() || await generateUniqueUsername(email, name);

    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      studentId: studentId.trim(), 
      username: finalUsername,
      password,
      role: 'user',
      status: 'active',
      isEmailVerified: true, // ✅ 7. อัปเดตเป็น true
    });
    
    await user.save();

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
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      let message = 'ข้อมูลนี้มีอยู่ในระบบแล้ว';
      if (field === 'email') message = 'อีเมลนี้มีอยู่ในระบบแล้ว';
      if (field === 'studentId') message = 'รหัสนักศึกษานี้มีอยู่ในระบบแล้ว';
      if (field === 'username') message = 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว';
      
      return res.status(400).json({ message, field });
    }
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


// (โค้ดส่วนที่เหลือ: /login, /google-login, /me, /verify, /logout เหมือนเดิม)
// ...
router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ 
      message: 'กรุณากรอกข้อมูลการเข้าสู่ระบบและรหัสผ่าน',
      field: !login ? 'login' : 'password'
    });
  }
  try {
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
    if (user.googleId && (!user.password || user.password.length > 100)) {
      return res.status(400).json({ 
        message: 'บัญชีนี้ใช้การเข้าสู่ระบบด้วย Google กรุณาใช้ปุ่ม "เข้าสู่ระบบด้วย Google"',
        field: 'login',
        isGoogleAccount: true
      });
    }
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
    const token = jwt.sign(
      { id: user._id, role: user.role || 'user' }, 
      process.env.JWT_SECRET as string, 
      { expiresIn: '7d' }
    );
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

router.post('/google-login', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ 
        message: 'ไม่พบ Google token',
        field: 'token'
      });
    }
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
    let user = await User.findOne({ email: payload.email });
    if (!user) {
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
      const updates: any = {};
      if (!user.googleId) updates.googleId = payload.sub;
      if (!user.profileImage && payload.picture) updates.profileImage = payload.picture;
      if (!user.isEmailVerified) updates.isEmailVerified = true;
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
      updates.lastLogin = new Date();
      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(user._id, updates);
        console.log('✅ Updated existing user with Google info:', user.email);
        user = await User.findById(user._id);
      }
    }
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
        studentId: user!._id,
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

router.get('/me', auth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }
    if (!user.profileImage) {
      user.profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128`;
    }
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
});

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

router.post('/logout', (req, res) => {
  res.json({ message: 'ออกจากระบบสำเร็จ' });
});


export default router;