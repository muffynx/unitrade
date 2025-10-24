/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { FaArrowLeft, FaSave, FaTimes, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from 'axios';

interface User {
  _id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  avatar?: string;
  university?: string;
  studentId?: string;
  createdAt: string;
  completedTrades?: number;
  listings?: number;
  rating?: number;
}

const ProfileEdit = () => {
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    university: '',
    studentId: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

        console.log('Fetching user data from MongoDB...');
        const userEndpoints = [
          '/api/users/me',
          '/api/users/profile',
          '/api/user/me',
          '/api/auth/me',
          '/api/user'
        ];

        let userData;
        for (const endpoint of userEndpoints) {
          try {
            const response = await axios.get(`${API_URL}${endpoint}`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5000
            });
            if (response.data && (response.data._id || response.data.id)) {
              userData = response.data;
              console.log(`Found user data from ${endpoint}`);
              break;
            }
          } catch (err) {
            console.log(`Endpoint ${endpoint} not available`);
          }
        }

        if (!userData) {
          throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ');
        }

        // Map ข้อมูลจาก API ไปยัง interface User
        const completeUser: User = {
          _id: userData._id || userData.id,
          name: userData.name || userData.username || 'ผู้ใช้',
          username: userData.username || userData.email?.split('@')[0] || 'user',
          email: userData.email || 'user@example.com',
          phone: userData.phone || '',
          avatar: userData.avatar || userData.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random&size=128`,
          university: userData.university || userData.school || '',
          studentId: userData.studentId || userData.studentID || '',
          createdAt: userData.createdAt || userData.joinDate || new Date().toISOString(),
          completedTrades: userData.completedTrades || userData.tradesCompleted || 0,
          listings: userData.listings || userData.listingsCount || 0,
          rating: userData.rating || userData.userRating || 4.5
        };

        setUser(completeUser);
        setFormData({
          name: completeUser.name,
          username: completeUser.username || '',
          email: completeUser.email,
          phone: completeUser.phone || '',
          university: completeUser.university || '',
          studentId: completeUser.studentId || ''
        });

      } catch (err: any) {
        console.error('Fetch user data error:', err);
        const errorMessage = err.response?.data?.message || err.message || 'ไม่สามารถดึงข้อมูลผู้ใช้ได้';
        setError(errorMessage);
        
        // ถ้าไม่สามารถดึงข้อมูลได้ ให้กลับไปหน้าโปรไฟล์
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.username.trim()) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return false;
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      setError('กรุณากรอกอีเมลให้ถูกต้อง');
      return false;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      setError('ชื่อผู้ใช้สามารถใช้ได้แค่ตัวอักษรอังกฤษ ตัวเลข และ underscore');
      return false;
    }

    return true;
  };

  const validatePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('กรุณากรอกรหัสผ่านทั้งหมด');
      return false;
    }

    if (passwordData.newPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return false;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('กรุณาเข้าสู่ระบบอีกครั้ง');
        navigate('/login');
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      console.log('Attempting to update profile in MongoDB...');
      const updateEndpoints = [
        '/api/users/profile',
        '/api/users/update',
        '/api/user/profile',
        '/api/user/update',
        '/api/users/me',
        '/api/user'
      ];

      let updateSuccess = false;
      let updatedUserData;

      for (const endpoint of updateEndpoints) {
        try {
          const response = await axios.put(
            `${API_URL}${endpoint}`,
            {
              name: formData.name,
              username: formData.username,
              email: formData.email,
              phone: formData.phone,
              university: formData.university,
              studentId: formData.studentId
            },
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );

          if (response.data) {
            console.log(`Update successful with endpoint: ${endpoint}`);
            updatedUserData = response.data;
            updateSuccess = true;
            break;
          }
        } catch (err: any) {
          console.log(`Endpoint ${endpoint} failed:`, err.response?.data);
          
          if (err.response?.data?.message) {
            setError(err.response.data.message);
            setSaving(false);
            return;
          }
        }
      }

      if (!updateSuccess) {
        throw new Error('ไม่สามารถอัพเดทข้อมูลในระบบได้ กรุณาลองใหม่อีกครั้ง');
      }
      if (updatedUserData) {
        const updatedUser: User = {
          _id: updatedUserData._id || updatedUserData.id || user._id,
          name: updatedUserData.name || formData.name,
          username: updatedUserData.username || formData.username,
          email: updatedUserData.email || formData.email,
          phone: updatedUserData.phone || formData.phone,
          avatar: updatedUserData.avatar || user.avatar,
          university: updatedUserData.university || formData.university,
          studentId: updatedUserData.studentId || formData.studentId,
          createdAt: updatedUserData.createdAt || user.createdAt,
          completedTrades: updatedUserData.completedTrades || user.completedTrades,
          listings: updatedUserData.listings || user.listings,
          rating: updatedUserData.rating || user.rating
        };
        
        setUser(updatedUser);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      console.error('Update profile error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'ไม่สามารถอัพเดทโปรไฟล์ได้';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    try {
      setChangingPassword(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('กรุณาเข้าสู่ระบบอีกครั้ง');
        navigate('/login');
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      console.log('Attempting to change password...');
      const passwordEndpoints = [
        '/api/users/change-password',
        '/api/users/password',
        '/api/user/change-password',
        '/api/user/password',
        '/api/auth/change-password'
      ];

      let passwordSuccess = false;

      for (const endpoint of passwordEndpoints) {
        try {
          const response = await axios.put(
            `${API_URL}${endpoint}`,
            {
              currentPassword: passwordData.currentPassword,
              newPassword: passwordData.newPassword
            },
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );

          if (response.data) {
            console.log(`Password change successful with endpoint: ${endpoint}`);
            passwordSuccess = true;
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            });
            
            setPasswordSuccess(true);
            setTimeout(() => {
              setPasswordSuccess(false);
            }, 3000);
            break;
          }
        } catch (err: any) {
          console.log(`Password endpoint ${endpoint} failed:`, err.response?.data);         
          if (err.response?.data?.message) {
            setError(err.response.data.message);
            setChangingPassword(false);
            return;
          }
        }
      }

      if (!passwordSuccess) {
        throw new Error('ไม่สามารถเปลี่ยนรหัสผ่านได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
      }
      
    } catch (err: any) {
      console.error('Change password error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้';
      setError(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancel = () => {
    navigate('/profile');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 font-sarabun">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">กำลังโหลดข้อมูลจากฐานข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sarabun">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <FaArrowLeft size={16} />
          กลับไปโปรไฟล์
        </button>
        <h1 className="text-2xl font-bold text-gray-900">แก้ไขโปรไฟล์</h1>
      </div>

      {/* Success Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          อัพเดทโปรไฟล์สำเร็จ!
        </div>
      )}

      {passwordSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          เปลี่ยนรหัสผ่านสำเร็จ!
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">ข้อมูลส่วนตัว</h2>
            <p className="text-sm text-gray-500 mt-1">อัพเดทข้อมูลส่วนตัวของคุณในระบบ</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรอกชื่อ-นามสกุลของคุณ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อผู้ใช้ *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรอกชื่อผู้ใช้"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมล *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรอกอีเมลของคุณ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  โทรศัพท์
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรอกเบอร์โทรศัพท์"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  มหาวิทยาลัย
                </label>
                <input
                  type="text"
                  name="university"
                  value={formData.university}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรอกชื่อมหาวิทยาลัย"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสนักศึกษา
                </label>
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="กรอกรหัสนักศึกษา"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <FaTimes size={16} />
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <FaSave size={16} />
                {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Change Password Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handlePasswordSubmit}>
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">เปลี่ยนรหัสผ่าน</h2>
            <p className="text-sm text-gray-500 mt-1">เปลี่ยนรหัสผ่านสำหรับบัญชีของคุณ</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่านปัจจุบัน *
                </label>
                <div className="relative">
                  <input
                    type={showPassword.current ? "text" : "password"}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword.current ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่านใหม่ *
                </label>
                <div className="relative">
                  <input
                    type={showPassword.new ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                    placeholder="กรอกรหัสผ่านใหม่"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword.new ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ยืนยันรหัสผ่านใหม่ *
                </label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                    placeholder="ยืนยันรหัสผ่านใหม่"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword.confirm ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={changingPassword}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FaSave size={16} />
                {changingPassword ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEdit;