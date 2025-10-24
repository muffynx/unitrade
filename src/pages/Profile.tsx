import { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaCog, FaHeart, FaBox, FaInbox, FaShoppingBag, FaStar, FaThumbsUp, FaComment, FaEye, FaCheckCircle } from "react-icons/fa";
import {Bookmark} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import ProductEditModal from '../components/ProductEditModal';
import Modal from '../components/Modal';
import ProductCreate from '../pages/ProductCreate';


interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  createdAt: string;
  location: string;
  sold?: boolean;
  views?: number;
  favorites?: string[]; 
}

interface Message {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budget?: number;
  urgency: string;
  likes: string[];
  comments: any[];
  views: number;
  createdAt: string;
  status: string;
}

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

const Profile = () => {
  const [activeTab, setActiveTab] = useState("listings");
  const [user, setUser] = useState<User | null>(null);

  const [soldListings, setSoldListings] = useState<Listing[]>([]);
  const [userListings, setUserListings] = useState<Listing[]>([]);

  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [isProductCreateModalOpen, setIsProductCreateModalOpen] = useState(false);

  const handleAuthenticatedAction = (action: () => void) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
      navigate('/login');
      return;
    }
    action();
  };

  const handleProductCreated = () => {
    setIsProductCreateModalOpen(false);
    fetchUserListings();
  };


const fetchSoldListings = async () => {
  try {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) throw new Error('ไม่พบ token');
    const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';



    const response = await axios.get(`${API_URL}/api/product`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { 
        userId: 'current',
        sold: 'true'  
      }
    });



    const soldProducts = response.data.map((product: any) => {
      const mappedProduct = {
        id: product._id,
        title: product.title,
        description: product.description,
        price: product.price,
        category: product.category,
        images: product.images || [],
        createdAt: product.createdAt,
        location: product.location,
        sold: product.sold === true || product.sold === 'true', 
        views: product.views || 0,
        favorites: product.favorites || [],
      };
      

      if (!mappedProduct.sold) {
        console.warn('⚠️ พบสินค้าที่ sold=false แต่ backend ส่งมาใน sold=true:', {
          id: mappedProduct.id,
          title: mappedProduct.title,
          sold: mappedProduct.sold,
          rawSold: product.sold
        });
      }
      
      return mappedProduct;
    }) as Listing[];


    setSoldListings(soldProducts);
    setLoading(false);
  } catch (err: any) {
    setError(err.response?.data?.message || err.message || 'ไม่สามารถดึงข้อมูลสินค้าได้');
    console.error('Fetch sold listings error:', err);
    setLoading(false);
  }
};










const fetchUserListings = async () => {
  try {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) throw new Error('ไม่พบ token');
    const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';


    const response = await axios.get(`${API_URL}/api/product`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { userId: 'current', sold: 'false' },
    });


    const wrongProducts = response.data.filter((p: any) => p.sold);
    if (wrongProducts.length > 0) {
      console.warn(`⚠️ พบสินค้าที่ sold=true แต่ backend ส่งมาใน sold=false (${wrongProducts.length} รายการ):`);
      console.table(wrongProducts.map((p: any) => ({
        id: p._id,
        title: p.title,
        sold: p.sold,
      })));
    }

    const unsoldProducts = response.data.map((product: any) => ({
      id: product._id,
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      images: product.images || [],
      createdAt: product.createdAt,
      location: product.location,
      sold: product.sold || false,
      views: product.views || 0,
      favorites: product.favorites || [],
    })) as Listing[];


    setUserListings(unsoldProducts);
    setLoading(false);
  } catch (err: any) {
    setError(err.response?.data?.message || err.message || 'ไม่สามารถดึงข้อมูลสินค้าได้');
    console.error('❌ Fetch user listings error:', err);
    setLoading(false);
  }
};


  // ฟังก์ชันดึงรายการโปรด
  const fetchFavoriteListings = async () => {
    try {
      setFavoritesLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('ไม่พบ token');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';

      const favoritesResponse = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const favoriteIds = favoritesResponse.data.favorites || favoritesResponse.data;

      if (!Array.isArray(favoriteIds) || favoriteIds.length === 0) {
        setFavoriteListings([]);
        setFavoritesLoading(false);
        return;
      }


      const favoriteProducts = await Promise.all(
        favoriteIds.slice(0, 20).map(async (id: string) => { // Limit 20 to avoid too many requests
          try {
            const response = await axios.get(`${API_URL}/api/product/${id}`);
            const product = response.data;
            return {
              id: product._id,
              title: product.title,
              description: product.description,
              price: product.price,
              category: product.category,
              images: product.images || [],
              createdAt: product.createdAt,
              location: product.location,
              sold: product.sold || false,
              views: product.views || 0,
              favorites: product.favorites || [],
            } as Listing;
          } catch (err) {
            console.error(`Failed to fetch product ${id}:`, err);
            return null;
          }
        })
      );

      setFavoriteListings(favoriteProducts.filter((p): p is Listing => p !== null));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'ไม่สามารถดึงรายการโปรดได้');
      console.error('Fetch favorites error:', err);
    } finally {
      setFavoritesLoading(false);
    }
  };

  // ฟังก์ชันดึงข้อความของผู้ใช้
  const fetchUserMessages = async () => {
    try {
      setMessageLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('ไม่พบ token');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';

      const response = await axios.get(`${API_URL}/api/messages`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { userId: 'current' }
      });

      const messages = response.data.map((msg: any) => ({
        _id: msg._id,
        title: msg.title,
        description: msg.description,
        category: msg.category,
        location: msg.location,
        budget: msg.budget,
        urgency: msg.urgency,
        likes: msg.likes || [],
        comments: msg.comments || [],
        views: msg.views || 0,
        createdAt: msg.createdAt,
        status: msg.status,
      })) as Message[];
      setUserMessages(messages);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'ไม่สามารถดึงข้อความได้');
      console.error('Fetch user messages error:', err);
    } finally {
      setMessageLoading(false);
    }
  };


const handleMarkAsSold = async (listingId: string) => {
  if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการทำเครื่องหมายว่าสินค้านี้ขายแล้ว?')) return;

  try {
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      alert('กรุณาเข้าสู่ระบบ');
      return;
    }
    const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';


    await axios.patch(`${API_URL}/api/product/${listingId}`, { sold: true }, {
      headers: { Authorization: `Bearer ${token}` }
    });


    await Promise.all([
      fetchSoldListings(),
      fetchUserListings()
    ]);

    // ✅ อัปเดต User Stats
    setUser(prev => prev ? {
      ...prev,
      completedTrades: (prev.completedTrades || 0) + 1
    } : prev);

    alert('✅ ทำเครื่องหมายว่าขายแล้วเรียบร้อย!');
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message || 'เกิดข้อผิดพลาด';
    setError(errorMsg);
    alert('❌ ' + errorMsg);
  }
};


  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setUserLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';

        let userData: any = null;
        const userEndpoints = [
          '/api/users/me', '/api/users/profile', '/api/user/me', '/api/auth/me', '/api/user/profile'
        ];

        for (const endpoint of userEndpoints) {
          try {
            const response = await axios.get(`${API_URL}${endpoint}`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000
            });
            if (response.data && (response.data._id || response.data.id)) {
              userData = response.data;
              break;
            }
          } catch (err) {
            // ignore
          }
        }

        if (!userData) {
          const savedUser = localStorage.getItem('user');
          if (savedUser) userData = JSON.parse(savedUser);
          if (!userData) {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decodedToken = JSON.parse(jsonPayload);
            userData = {
              _id: decodedToken.userId || decodedToken.id || '1',
              name: decodedToken.name || 'ผู้ใช้',
              email: decodedToken.email || 'user@example.com',
              studentId: decodedToken.studentId || '653450000-0'
            };
          }
        }

        const completeUser: User = {
          _id: userData._id || userData.id || '1',
          name: userData.name || userData.username || 'ผู้ใช้',
          username: userData.username || userData.email?.split('@')[0] || 'user',
          email: userData.email || 'user@example.com',
          phone: userData.phone || '090-000-0000',
          avatar: userData.avatar || userData.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random&size=128`,
          university: userData.university || userData.school || 'มหาวิทยาลัย',
          studentId: userData.studentId || userData.studentID || '653450000-0',
          createdAt: userData.createdAt || userData.joinDate || new Date().toISOString(),
          completedTrades: userData.completedTrades || userData.tradesCompleted || userData.transactions || 0,
          listings: userData.listings || userData.listingsCount || userData.productsCount || 0,
        };

        setUser(completeUser);
        localStorage.setItem('user', JSON.stringify(completeUser));
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'ไม่สามารถดึงข้อมูลผู้ใช้ได้';
        setError(errorMessage);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);
    

  useEffect(() => {

    if (user && user._id) {
        if (activeTab === 'listings') {
            fetchUserListings();  // Fetch unsold
        } else if (activeTab === 'soldListings') {
            fetchSoldListings();  // Fetch sold
        } else if (activeTab === 'favorites') {
            fetchFavoriteListings();
        } else if (activeTab === 'messages') {
            fetchUserMessages();
        }
    }
  }, [activeTab, user]); // Depend on activeTab and user (re-fetching on tab change)

  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) return;
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';

      const deleteEndpoints = [
        `/api/products/${listingId}`,
        `/api/product/${listingId}`
      ];

      let deletedFromBackend = false;
      for (const endpoint of deleteEndpoints) {
        try {
          await axios.delete(`${API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          });
          deletedFromBackend = true;
          break;
        } catch (err) {
          // ignore
        }
      }

      // Remove from both local state lists
      setUserListings(prev => prev.filter(listing => listing.id !== listingId));
      setSoldListings(prev => prev.filter(listing => listing.id !== listingId));

      setUser(prev => prev ? { ...prev, listings: Math.max(0, (prev.listings || 1) - 1) } : prev);
      alert(deletedFromBackend ? 'ลบสินค้าสำเร็จ' : 'ลบสินค้าสำเร็จ (frontend only)');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'ไม่สามารถลบสินค้าได้';
      setError(errorMessage);
      alert('เกิดข้อผิดพลาดในการลบสินค้า: ' + errorMessage);
    }
  };

  const handleEditListing = (listingId: string) => {
    setEditingListingId(listingId);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingListingId(null);
  };

  const handleListingUpdate = () => {
    fetchUserListings();
  };

  const handleAddNewListing = () => {
    handleAuthenticatedAction(() => setIsProductCreateModalOpen(true));
  };

  const handleRemoveFavorite = async (listingId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบออกจากรายการโปรด?')) return;
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';

      await axios.delete(`${API_URL}/api/favorites/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFavoriteListings(prev => prev.filter(listing => listing.id !== listingId));
      alert('ลบออกจากรายการโปรดแล้ว');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'ไม่สามารถลบออกจากรายการโปรดได้';
      setError(errorMessage);
      alert('เกิดข้อผิดพลาด: ' + errorMessage);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อความนี้?')) return;
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';

      await axios.delete(`${API_URL}/api/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUserMessages(prev => prev.filter(msg => msg._id !== messageId));
      alert('ลบข้อความสำเร็จ');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'ไม่สามารถลบข้อความได้';
      setError(errorMessage);
      alert('เกิดข้อผิดพลาด: ' + errorMessage);
    }
  };

  const handleEditMessage = (messageId: string) => {
    navigate(`/message/edit/${messageId}`);
  };

  const getCategoryDisplay = (category: string) => {
    const map: Record<string, string> = {
      "electronics": "เครื่องใช้ไฟฟ้า",
      "furniture": "เฟอร์นิเจอร์",
      "textbooks": "หนังสือเรียน",
      "sports": "กีฬา",
      "other": "อื่นๆ"
    };
    return map[category] || category;
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high': return <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">เร่งด่วน</span>;
      case 'medium': return <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">ปานกลาง</span>;
      case 'low': return <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">ไม่เร่งด่วน</span>;
      default: return null;
    }
  };

  if (userLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 font-sarabun">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">กำลังโหลดข้อมูลผู้ใช้...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 font-sarabun">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ไม่พบข้อมูลผู้ใช้</h2>
          <p className="text-gray-500 mb-4">กรุณาเข้าสู่ระบบอีกครั้ง</p>
          {error && <p className="text-red-500 mb-4">Error: {error}</p>}
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            ไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  const joinDate = new Date(user.createdAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sarabun">
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

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random&size=128`;
              }}
            />
            <Link
              to="/profile/edit"
              className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-colors"
            >
              <FaEdit size={14} />
            </Link>
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                <p className="text-gray-600">@{user.username}</p>
                {user.studentId && (
                  <p className="text-gray-500 text-sm">รหัสนักศึกษา: {user.studentId}</p>
                )}
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/profile/edit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                  <FaEdit size={14} /> แก้ไขโปรไฟล์
                </Link>
                <button
                  className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => alert('กำลังพัฒนาการตั้งค่า')}
                >
                  <FaCog size={18} />
                </button>
              </div>
            </div>

            <p className="text-gray-500 mb-4">{user.university} • เข้าร่วม {joinDate}</p>

            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col items-center">
                <p className="text-xl font-bold text-gray-900">{user.completedTrades}</p>
                <p className="text-sm text-gray-500">การซื้อขาย</p>
              </div>
              <div className="flex flex-col items-center">
                {/* ✅ FIX: Display combined count */}
                <p className="text-xl font-bold text-gray-900">{userListings.length + soldListings.length}</p> 
                <p className="text-sm text-gray-500">รายการสินค้า</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center">
                  <p className="text-xl font-bold text-gray-900">{user.rating?.toFixed(1)}</p>
                  {user.rating && <FaStar className="w-4 h-4 text-yellow-500 ml-1" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

{/* 🔥 MOBILE-FRIENDLY TABS */}
<div className="bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
  <div className="flex overflow-x-auto scrollbar-hide">
    {[
      { id: 'listings', label: 'กำลังขาย', icon: FaBox, count: userListings.length },
      { id: 'soldListings', label: 'ขายแล้ว', icon: FaCheckCircle, count: soldListings.length },
      { id: 'favorites', label: 'โปรด', icon: Bookmark, count: favoriteListings.length },
      { id: 'messages', label: 'ข้อความ', icon: FaInbox, count: userMessages.length }
    ].map(tab => (
      <button
        key={tab.id}
        className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap transition-all ${
          activeTab === tab.id
            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
            : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
        }`}
        onClick={() => setActiveTab(tab.id as any)}
      >
        <tab.icon size={14} />
        <span>{tab.label}</span>
        {tab.count > 0 && (
          <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
</div>





      {/* Content based on active tab - Listings (Unsold) */}
      {activeTab === "listings" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">รายการสินค้าของฉัน </h2>
            <button
              className="bg-blue-600 text-white py-2 px-6 rounded-full font-semibold hover:bg-blue-700 transition-colors"
              onClick={handleAddNewListing}
            >
              + เพิ่มรายการสินค้า
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : userListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userListings.map(listing => (
                <div key={listing.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${listing.sold
                    ? 'border-red-200 bg-red-50/50 opacity-90'
                    : 'border-gray-100 hover:shadow-md'
                  }`}>
                  <Link to={`/product/${listing.id}`} className="block">
                    <div className="relative">
                      <img
                        src={listing.images[0] || 'https://via.placeholder.com/360x192?text=No+Image'}
                        alt={listing.title}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/360x192?text=No+Image';
                        }}
                      />
                      <span className={`absolute top-2 left-2 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm ${listing.category === "electronics" ? "bg-purple-500" :
                          listing.category === "furniture" ? "bg-yellow-500" :
                            listing.category === "textbooks" ? "bg-green-500" :
                              listing.category === "sports" ? "bg-blue-500" : "bg-gray-500"
                        }`}>
                        {getCategoryDisplay(listing.category)}
                      </span>
                      {listing.sold && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-sm flex items-center gap-1">
                          <FaCheckCircle size={12} /> ขายแล้ว
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Link to={`/product/${listing.id}`} className="flex-1">
                        <h3 className={`font-semibold line-clamp-1 ${listing.sold ? 'text-gray-700' : 'text-gray-900 hover:text-blue-600'}`}>
                          {listing.sold && <span className="text-red-500 mr-2">✅</span>}
                          {listing.title}
                        </h3>
                      </Link>
                      <div className="flex gap-1 ml-3 flex-shrink-0">
                        {!listing.sold && (
                          <button
                            className="bg-green-100 text-green-700 p-1.5 rounded-full hover:bg-green-200 transition-colors shadow-sm"
                            onClick={(e) => { e.stopPropagation(); handleMarkAsSold(listing.id); }}
                            title="ทำเครื่องหมายว่าขายแล้ว"
                          >
                            <FaCheckCircle size={14} />
                          </button>
                        )}


                        {!listing.sold && (
                          <button
                            className="bg-blue-100 text-blue-700 p-1.5 rounded-full hover:bg-blue-200 transition-colors shadow-sm"
                            onClick={(e) => { e.stopPropagation(); handleEditListing(listing.id); }}
                            title="แก้ไขสินค้า"
                          >
                            <FaEdit size={14} />
                          </button>

                        )}
                        <button
                          className="bg-red-100 text-red-700 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteListing(listing.id); }}
                          title="ลบสินค้า"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>

                    <p className={`text-lg font-bold mb-2 ${listing.sold ? 'text-gray-500 line-through' : 'text-blue-600'}`}>
                      ฿{listing.price.toLocaleString()}
                    </p>
                    <p className={`text-sm line-clamp-2 mb-3 ${listing.sold ? 'text-gray-600' : 'text-gray-500'}`}>
                      {listing.description}
                    </p>

                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1">
                        <FaEye size={12} /> {listing.views}
                      </span>
                      <span>โพสต์ {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true, locale: th })}</span>
                    </div>
                    <div className="text-xs text-gray-400 truncate">{listing.location}</div>
                  </div>
                </div>



              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <FaBox size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">ยังไม่มีรายการสินค้า</h3>
              <p className="text-gray-500 mb-6">เริ่มขายสินค้าของคุณให้เพื่อนนักศึกษา</p>
              <button
                onClick={handleAddNewListing}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                สร้างรายการสินค้าแรก
              </button>
            </div>
          )}
        </div>
      )}


      {/* Content based on active tab - Sold Listings */}
{activeTab === "soldListings" && (
  <div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4">สินค้าที่ขายแล้ว</h2>

    {loading ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
        ))}
      </div>

    ) : soldListings.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {soldListings.map(listing => (
          <div key={listing.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${listing.sold
              ? 'border-red-200 bg-red-50/50 opacity-90'
              : 'border-gray-100 hover:shadow-md'
            }`}>
            <Link to={`/product/${listing.id}`} className="block">
              <div className="relative">
                <img
                  src={listing.images[0] || 'https://via.placeholder.com/360x192?text=No+Image'}
                  alt={listing.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/360x192?text=No+Image';
                  }}
                />
                <span className={`absolute top-2 left-2 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm ${listing.category === "electronics" ? "bg-purple-500" :
                    listing.category === "furniture" ? "bg-yellow-500" :
                      listing.category === "textbooks" ? "bg-green-500" :
                        listing.category === "sports" ? "bg-blue-500" : "bg-gray-500"
                  }`}>
                  {getCategoryDisplay(listing.category)}
                </span>
                {listing.sold && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-sm flex items-center gap-1">
                    <FaCheckCircle size={12} /> ขายแล้ว
                  </span>
                )}
              </div>
            </Link>

            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <Link to={`/product/${listing.id}`} className="flex-1">
                  <h3 className={`font-semibold line-clamp-1 ${listing.sold ? 'text-gray-700' : 'text-gray-900 hover:text-blue-600'}`}>
                    {listing.sold && <span className="text-red-500 mr-2">✅</span>}
                    {listing.title}
                  </h3>
                </Link>
                <div className="flex gap-1 ml-3 flex-shrink-0">
                  <button
                    className="bg-red-100 text-red-700 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                    onClick={(e) => { e.stopPropagation(); handleDeleteListing(listing.id); }}
                    title="ลบสินค้า"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>

              <p className={`text-lg font-bold mb-2 ${listing.sold ? 'text-gray-500 line-through' : 'text-blue-600'}`}>
                ฿{listing.price.toLocaleString()}
              </p>
              <p className={`text-sm line-clamp-2 mb-3 ${listing.sold ? 'text-gray-600' : 'text-gray-500'}`}>
                {listing.description}
              </p>

              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1">
                  <FaEye size={12} /> {listing.views}
                </span>
                <span>โพสต์ {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true, locale: th })}</span>
              </div>
              <div className="text-xs text-gray-400 truncate">{listing.location}</div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <FaBox size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">ยังไม่มีรายการที่ขายแล้ว</h3>
        <p className="text-gray-500 mb-6">รายการสินค้าที่คุณขายจะแสดงที่นี่</p>
      </div>
    )}
  </div>
)}


      {/* Favorites Tab */}
      {activeTab === "favorites" && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">รายการโปรด</h2>

          {favoritesLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-500">กำลังโหลดรายการโปรด...</span>
            </div>
          ) : favoriteListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteListings.map(listing => (
                <div key={listing.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${listing.sold
                    ? 'border-red-200 bg-red-50/30 opacity-90'
                    : 'border-gray-100 hover:shadow-md'
                  }`}>
                  <Link to={`/product/${listing.id}`} className="block">
                    <div className="relative">
                      <img
                        src={listing.images[0] || 'https://via.placeholder.com/360x192?text=No+Image'}
                        alt={listing.title}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/360x192?text=No+Image';
                        }}
                      />
                      <span className={`absolute top-2 left-2 text-white text-xs px-2 py-1 rounded-full ${listing.category === "electronics" ? "bg-purple-500" :
                          listing.category === "furniture" ? "bg-yellow-500" :
                            listing.category === "textbooks" ? "bg-green-500" :
                              listing.category === "sports" ? "bg-blue-500" : "bg-gray-500"
                        }`}>
                        {getCategoryDisplay(listing.category)}
                      </span>
                      {listing.sold && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          ขายแล้ว
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Link to={`/product/${listing.id}`} className="flex-1">
                        <h3 className={`font-semibold line-clamp-1 ${listing.sold ? 'text-gray-700' : 'text-gray-900 hover:text-blue-600'
                          }`}>
                          {listing.sold && <span className="text-red-500 mr-1">🔴</span>}
                          {listing.title}
                        </h3>
                      </Link>
                      <button
                        className="bg-red-500 text-white p-1.5 rounded-full shadow-sm hover:bg-red-600 transition-colors ml-4"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(listing.id); }}
                        title="ลบออกจากรายการโปรด"
                      >
                        <Bookmark size={14} />
                      </button>
                    </div>

                    <p className={`text-lg font-bold mb-2 ${listing.sold ? 'text-gray-500 line-through' : 'text-blue-600'
                      }`}>
                      ฿{listing.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{listing.description}</p>

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>โพสต์ {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true, locale: th })}</span>
                      <span>{listing.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Bookmark size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">ยังไม่มีรายการโปรด</h3>
              <p className="text-gray-500 mb-6">บันทึกรายการที่คุณสนใจเพื่อดูในภายหลัง</p>
              <Link to="/browse" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                ดูรายการสินค้า
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === "messages" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">ข้อความของฉัน</h2>
            <Link
              to="/browse"
              className="bg-blue-600 text-white py-2 px-6 rounded-full font-semibold hover:bg-blue-700 transition-colors"
            >
              + โพสต์ข้อความใหม่
            </Link>
          </div>

          {messageLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-500">กำลังโหลด...</span>
            </div>
          ) : userMessages.length > 0 ? (
            <div className="space-y-4">
              {userMessages.map(msg => (
                <div key={msg._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{msg.title}</h3>
                        {getUrgencyBadge(msg.urgency)}
                        <span className={`text-xs px-2 py-1 rounded-full text-white ${msg.category === "electronics" ? "bg-purple-500" :
                            msg.category === "furniture" ? "bg-yellow-500" :
                              msg.category === "textbooks" ? "bg-green-500" :
                                msg.category === "sports" ? "bg-blue-500" : "bg-gray-500"
                          }`}>
                          {getCategoryDisplay(msg.category)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{msg.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FaEye size={14} /> {msg.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaThumbsUp size={14} /> {msg.likes.length}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaComment size={14} /> {msg.comments.length}
                        </span>
                        <span className="truncate max-w-[120px]">{msg.location}</span>
                        <span>โพสต์ {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: th })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 flex-shrink-0">
                      <button
                        className="bg-gray-100 text-gray-700 p-1.5 rounded-full shadow-sm hover:bg-gray-200 transition-colors"
                        onClick={() => handleEditMessage(msg._id)}
                        title="แก้ไขข้อความ"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        className="bg-gray-100 text-red-500 p-1.5 rounded-full shadow-sm hover:bg-gray-200 transition-colors"
                        onClick={() => handleDeleteMessage(msg._id)}
                        title="ลบข้อความ"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                  {msg.budget && (
                    <p className="text-sm font-medium text-blue-600">งบประมาณ: ฿{msg.budget.toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <FaInbox size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">ยังไม่มีข้อความ</h3>
              <p className="text-gray-500 mb-6">โพสต์ข้อความเพื่อมองหาสินค้าที่ต้องการ</p>
              <Link to="/browse" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                โพสต์ข้อความแรก
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === "purchases" && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <FaShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">ยังไม่มีการซื้อ</h3>
          <p className="text-gray-500 mb-6">สินค้าที่คุณซื้อจะแสดงที่นี่</p>
          <Link to="/browse" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            ดูรายการสินค้า
          </Link>
        </div>
      )}

      <Modal
        isOpen={isProductCreateModalOpen}
        onClose={() => setIsProductCreateModalOpen(false)}
        title="โพสต์สินค้าใหม่"
      >
        <ProductCreate
          onClose={() => setIsProductCreateModalOpen(false)}
          onSuccess={handleProductCreated}
        />
      </Modal>

      {isEditModalOpen && editingListingId && (
        <ProductEditModal
          productId={editingListingId}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onUpdate={handleListingUpdate}
        />
      )}
    </div>
  );
};

export default Profile;