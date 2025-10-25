import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  FaUser, 
  FaLock, 
  FaBell, 
  FaPalette, 
  FaSave, 
  FaTimes, 
  FaCheck,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaChevronLeft,
  FaCamera, // Added Camera icon
  FaSpinner // Added Spinner icon
} from 'react-icons/fa';
import '../i18n';

interface User {
  _id: string;
  name: string;
  email: string;
  studentId: string;
  profileImage?: string;
  phone?: string;
  university?: string;
  username?: string;
}

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  showPassword, 
  setShowPassword 
}) => (
  <div className="relative">
    <input
      type={showPassword ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
    </button>
  </div>
);

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // State สำหรับการอัปโหลดรูปภาพ
  const [message, setMessage] = useState({ text: '', type: '' });
  const [user, setUser] = useState<User | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref สำหรับ input file

  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    university: '',
    studentId: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    language: i18n.language, 
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false
  });

  const [theme, setTheme] = useState('light');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  };

  const fetchUserProfile = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const userData = response.data;
      setUser(userData);
      setProfileForm({
        name: userData.name || '',
        username: userData.username || '',
        email: userData.email || '',
        phone: userData.phone || '',
        university: userData.university || '',
        studentId: userData.studentId || ''
      });

      setPreferences(prev => ({
        ...prev,
        language: i18n.language 
      }));
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setMessage({ text: t('failed_to_load_profile') || 'Failed to load profile', type: 'error' });
    }
  }, [navigate, t, i18n, API_URL]);

  useEffect(() => {
    fetchUserProfile();
    loadTheme();
  }, [fetchUserProfile]);
  
  useEffect(() => {
    setPreferences(prev => ({ ...prev, language: i18n.language }));
  }, [i18n.language]);

  // --- Function: Handle Image Upload ---
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit check
      setMessage({ text: t('file_too_large') || 'File size exceeds 5MB limit.', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('profileImage', file);

    const token = localStorage.getItem('token');
    setIsUploading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await axios.put(
        `${API_URL}/api/users/profile/image`, 
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser)); // Update local storage
      setMessage({ 
        text: t('profile_image_updated') || 'Profile image updated successfully', 
        type: 'success' 
      });

    } catch (error: any) {
      console.error('Image upload error:', error);
      const errorMsg = error.response?.data?.message || t('upload_failed') || 'Image upload failed';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsUploading(false);
      // Clear file input value
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const token = localStorage.getItem('token');
      
      if (!profileForm.name.trim()) {
        setMessage({ text: t('name_required') || 'Name is required', type: 'error' });
        setLoading(false);
        return;
      }
      if (!profileForm.username.trim()) {
        setMessage({ text: t('username_required') || 'Username is required', type: 'error' });
        setLoading(false);
        return;
      }
      if (!profileForm.email.trim()) {
        setMessage({ text: t('email_required') || 'Email is required', type: 'error' });
        setLoading(false);
        return;
      }

      const response = await axios.put(
        `${API_URL}/api/users/profile`, 
        {
          name: profileForm.name.trim(),
          username: profileForm.username.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
          university: profileForm.university.trim(),
          studentId: profileForm.studentId.trim()
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setMessage({ 
        text: t('profile_updated_successfully') || 'Profile updated successfully', 
        type: 'success' 
      });

      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);

    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMsg = error.response?.data?.message || t('update_failed') || 'Update failed';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword) {
      setMessage({ text: t('current_password_required') || 'Current password is required', type: 'error' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ text: t('passwords_do_not_match') || 'Passwords do not match', type: 'error' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ text: t('password_min_length') || 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const token = localStorage.getItem('token');

      await axios.put(
        `${API_URL}/api/users/change-password`, 
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setMessage({ 
        text: t('password_changed_successfully') || 'Password changed successfully', 
        type: 'success' 
      });
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);

    } catch (error: any) {
      console.error('Password change error:', error);
      
      let errorMsg = t('password_change_failed') || 'Password change failed';
      
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    setPreferences(prev => ({ ...prev, language: lng }));
    setMessage({ text: t('language_changed') || 'Language changed', type: 'success' });
    
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 2000);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('confirm_account_deletion') || 'Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      await axios.delete(`${API_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setMessage({ text: t('account_deleted_successfully') || 'Account deleted successfully', type: 'success' });
      
      setTimeout(() => {
        navigate('/browse');
      }, 2000);
    } catch (error) {
      console.error('Account deletion error:', error);
      setMessage({ text: t('account_deletion_failed') || 'Account deletion failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: t('profile') || 'Profile', icon: FaUser },
    { id: 'security', label: t('security') || 'Security', icon: FaLock },
    { id: 'notifications', label: t('notifications') || 'Notifications', icon: FaBell },
    { id: 'appearance', label: t('appearance') || 'Appearance', icon: FaPalette },
  ];

  // ✅ Updated Avatar Component with Upload
  const renderAvatar = () => {
    // Check if profileImage is a local path (starts with /) or a full URL/avatar API
    const avatarUrl = user?.profileImage && user.profileImage.startsWith('/') 
        ? `${API_URL}${user.profileImage}`
        : user?.profileImage || 
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=random&size=128`;
    
    // State to handle image loading errors (to switch to initials if the custom image fails)
    const [imgError, setImgError] = useState(!user?.profileImage);

    useEffect(() => {
        setImgError(!user?.profileImage);
    }, [user?.profileImage]);


    return (
      <div className="relative group w-28 h-28 flex-shrink-0">
        {/* Hidden Input for file selection */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/jpeg,image/png,image/jpg"
          className="hidden"
          disabled={isUploading}
        />

        {/* Avatar Display */}
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg bg-gray-100 flex items-center justify-center">
            
            {(user?.profileImage && !imgError) ? (
                <img
                    src={avatarUrl}
                    alt={user?.name || "User Avatar"}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className="text-4xl font-bold text-blue-600">
                     {user ? (user.name ? user.name.charAt(0).toUpperCase() : "U") : "U"}
                </div>
            )}
        </div>
        
        {/* Upload Button Overlay */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`absolute inset-0 w-full h-full rounded-full flex items-center justify-center bg-black bg-opacity-40 text-white opacity-0 transition-opacity group-hover:opacity-100 ${isUploading ? 'opacity-100 cursor-not-allowed' : ''}`}
          aria-label={t('change_profile_picture') || 'Change profile picture'}
        >
          {isUploading ? (
            <FaSpinner className="animate-spin" size={24} />
          ) : (
            <FaCamera size={24} />
          )}
        </button>
      </div>
    );
  };
  // End of renderAvatar

  return (
    <div className="min-h-screen bg-gray-50 py-8 font-sarabun">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* ✅ Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('settings') || 'Settings'}</h1>
              <p className="text-gray-600 mt-2">{t('manage_your_account_settings') || 'Manage your account settings'}</p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <FaChevronLeft size={12} />
              {t('back') || 'Back'}
            </button>
          </div>
        </div>

        {/* ✅ Alert Message */}
        {(message.text || isUploading) && ( // Show alert if uploading is in progress
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200'
              : message.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : isUploading ? 'bg-blue-50 text-blue-800 border border-blue-200' : ''
          }`}>
            <span className="flex items-center gap-2">
              {isUploading && <FaSpinner className="animate-spin" />}
              {isUploading ? (t('uploading_image') || 'Uploading image...') : message.text}
            </span>
            <button 
              onClick={() => setMessage({ text: '', type: '' })}
              className={`text-gray-500 hover:text-gray-700 ${isUploading ? 'hidden' : ''}`}
            >
              <FaTimes size={14} />
            </button>
          </div>
        )}

        {/* ✅ Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            
            {/* ✅ Sidebar Tabs */}
            <div className="lg:w-64 bg-gray-50 border-r border-gray-200">
              <nav className="p-4 space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                        activeTab === tab.id
                          ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* ✅ Content Area */}
            <div className="flex-1 p-6 lg:p-8">
              
              {/* ============ PROFILE TAB ============ */}
              {activeTab === 'profile' && (
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    {t('profile_settings') || 'Profile Settings'}
                  </h2>
                  
                  {/* ✅ Profile Header Card (Now includes avatar upload feature) */}
                  <div className="flex items-start gap-6 mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    {renderAvatar()}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
                      <p className="text-gray-600">@{user?.username || user?.email?.split('@')[0]}</p>
                      <div className="mt-3 space-y-1 text-sm text-gray-600">
                        <div className="text-gray-500">
                            {t('click_avatar_to_change') || 'Click on the image to change your profile picture.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ✅ Profile Form */}
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                          {t('full_name') || 'Full Name'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          placeholder="กรอกชื่อ-นามสกุล"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="username">
                          {t('username') || 'Username'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="username"
                          type="text"
                          value={profileForm.username}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          placeholder="ชื่อผู้ใช้"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                          {t('email') || 'Email'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          placeholder="email@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="phone">
                          {t('phone_number') || 'Phone Number'}
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0XX-XXX-XXXX"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="university">
                          {t('university') || 'University'}
                        </label>
                        <input
                          id="university"
                          type="text"
                          value={profileForm.university}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, university: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="มหาวิทยาลัย..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="studentId">
                          {t('student_id') || 'Student ID'}
                        </label>
                        <input
                          id="studentId"
                          type="text"
                          value={profileForm.studentId}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, studentId: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="653450000-0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        type="submit"
                        disabled={loading || isUploading}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        <FaSave size={14} />
                        {loading ? (t('saving') || 'Saving...') : (t('save_changes') || 'Save Changes')}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <FaTimes size={14} />
                        {t('cancel') || 'Cancel'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ============ SECURITY TAB ============ */}
              {activeTab === 'security' && (
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    {t('security_settings') || 'Security Settings'}
                  </h2>
                  
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('current_password') || 'Current Password'} <span className="text-red-500">*</span>
                        </label>
                        <PasswordInput
                          value={passwordForm.currentPassword}
                          onChange={(value) => setPasswordForm(prev => ({ ...prev, currentPassword: value }))}
                          placeholder={t('enter_current_password') || 'Enter current password'}
                          showPassword={showCurrentPassword}
                          setShowPassword={setShowCurrentPassword}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('new_password') || 'New Password'} <span className="text-red-500">*</span>
                        </label>
                        <PasswordInput
                          value={passwordForm.newPassword}
                          onChange={(value) => setPasswordForm(prev => ({ ...prev, newPassword: value }))}
                          placeholder={t('enter_new_password') || 'Enter new password (min 6 characters)'}
                          showPassword={showNewPassword}
                          setShowPassword={setShowNewPassword}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('confirm_password') || 'Confirm Password'} <span className="text-red-500">*</span>
                        </label>
                        <PasswordInput
                          value={passwordForm.confirmPassword}
                          onChange={(value) => setPasswordForm(prev => ({ ...prev, confirmPassword: value }))}
                          placeholder={t('confirm_new_password') || 'Confirm new password'}
                          showPassword={showConfirmPassword}
                          setShowPassword={setShowConfirmPassword}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || isUploading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      <FaLock size={14} />
                      {loading ? (t('changing_password') || 'Changing...') : (t('change_password') || 'Change Password')}
                    </button>
                  </form>

                  {/* ✅ DANGER ZONE */}
                  <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-red-600 mb-4">
                      {t('dangerous_zone') || 'Danger Zone'}
                    </h3>
                    
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h4 className="font-medium text-red-700">
                            {t('delete_account') || 'Delete Account'}
                          </h4>
                          <p className="text-sm text-red-600 mt-1">
                            {t('delete_account_confirm_warning') || 'Once you delete your account, all your data will be permanently removed.'}
                          </p>
                        </div>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={loading || isUploading}
                          className="flex items-center gap-2 px-4 py-2 whitespace-nowrap text-red-700 border border-red-300 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          <FaTrash size={14} />
                          {t('delete_account') || 'Delete Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============ NOTIFICATIONS TAB ============ */}
              {activeTab === 'notifications' && (
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    {t('notification_settings') || 'Notification Settings'}
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {t('email_notifications') || 'Email Notifications'}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {t('enable_email_notifications_description') || 'Receive updates via email'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={preferences.emailNotifications}
                            onChange={(e) => setPreferences(prev => ({ ...prev, emailNotifications: e.target.checked }))} 
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {t('push_notifications') || 'Push Notifications'}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {t('enable_push_notifications_description') || 'Receive notifications on your device'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={preferences.pushNotifications}
                            onChange={(e) => setPreferences(prev => ({ ...prev, pushNotifications: e.target.checked }))} 
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============ APPEARANCE TAB ============ */}
              {activeTab === 'appearance' && (
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    {t('appearance_settings') || 'Appearance Settings'}
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="p-6 border border-gray-200 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-4">
                        {t('language') || 'Language'}
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleLanguageChange('en')}
                          className={`py-3 px-4 border rounded-lg transition-all ${
                            preferences.language === 'en'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold shadow-sm'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-2 justify-center">
                            <FaCheck 
                              size={12} 
                              className={preferences.language === 'en' ? 'opacity-100' : 'opacity-0'} 
                            />
                            {t('english_name') || 'English'}
                          </span>
                        </button>
                        
                        <button
                          onClick={() => handleLanguageChange('th')}
                          className={`py-3 px-4 border rounded-lg transition-all ${
                            preferences.language === 'th'
                              ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold shadow-sm'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-2 justify-center">
                            <FaCheck 
                              size={12} 
                              className={preferences.language === 'th' ? 'opacity-100' : 'opacity-0'} 
                            />
                            {t('thai_name') || 'ไทย'}
                          </span>
                        </button>
                      </div >
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;