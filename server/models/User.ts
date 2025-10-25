import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  studentId: string;
  password: string;
  username: string;
  phone?: string;
  university?: string;
  role?: string;
  googleId?: string;
  profileImage?: string;
  isEmailVerified?: boolean;
  status: string;
  lastLogin?: Date;
  averageRating: number; // ✅ เพิ่ม
  reviewCount: number; // ✅ เพิ่ม
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  phone: {
    type: String,
    default: ''
  },
  university: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: "active"
  },
  lastLogin: {  // Add this field
    type: Date,
    default: null
  },
  averageRating: { type: Number, default: 0 }, 
  reviewCount: { type: Number, default: 0 }, 
}, {
  timestamps: true
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Indexes for searching
userSchema.index({ email: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ googleId: 1 });

export default mongoose.model<IUser>('User', userSchema);