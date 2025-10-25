import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Heart,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  MapPin,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import ProductCreate from './ProductCreate';

// Interface สำหรับข้อมูลสินค้า
interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  condition: string;
  location: string;
  createdAt: string;
  user: { _id: string; name: string };
  views: number;
  favorites: string[];
}

// Component Modal
const Modal = ({
  isOpen,
  onClose,
  title,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sarabun"
      onClick={handleBackgroundClick}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          onClick={onClose}
          variant="ghost"
          className="absolute top-4 right-4 p-2"
        >
          <X className="h-6 w-6" />
        </Button>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
};

// Component ปุ่มพื้นฐาน
const Button = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false
}: {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) => {
  const baseClasses = "flex items-center justify-center font-medium rounded-lg transition-colors font-sarabun";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100"
  };

  return (
    <button
      type="button"
      onClick={(e) => onClick?.(e)}
      className={`${baseClasses} ${variantClasses[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Component Badge พื้นฐาน
const Badge = ({
  children,
  className = '',
  color = 'blue'
}: {
  children: React.ReactNode;
  className?: string;
  color?: 'blue' | 'purple' | 'yellow' | 'green';
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-sarabun ${colorClasses[color]} ${className}`}>
      {children}
    </span>
  );
};

// Component Card พื้นฐาน
const Card = ({
  children,
  className = '',
  onClick
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <div
    className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

const CardHeader = ({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`p-4 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h3 className={`font-medium font-sarabun ${className}`}>
    {children}
  </h3>
);

const CardContent = ({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`p-4 pt-0 ${className}`}>
    {children}
  </div>
);

// Component ProductItem สำหรับแสดงสินค้า
function ProductItem({ 
  product, 
  onDelete, 
  onRemoveFavorite, 
  isFavorite = false 
}: { 
  product: Product; 
  onDelete?: () => void; 
  onRemoveFavorite?: () => void; 
  isFavorite?: boolean;
}) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const openModal = (index: number) => {
    setModalImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const nextImage = () => setModalImageIndex((prev) => (prev + 1) % product.images.length);
  const prevImage = () => setModalImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <Card className="flex items-center justify-between p-4 rounded-lg shadow-md">
      <div className="flex items-center space-x-4">
        <img
          src={product.images[0] || 'https://via.placeholder.com/150?text=No+Image'}
          alt={product.title}
          className="w-16 h-16 object-cover rounded cursor-pointer"
          onClick={() => openModal(0)}
        />
        <div>
          <h3 
            className="font-medium hover:text-blue-600 cursor-pointer" 
            onClick={() => navigate(`/product/${product._id}`)}
          >
            {product.title}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(product.createdAt), { addSuffix: true, locale: th })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {product.location}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {product.views} ครั้ง
            </span>
          </div>
        </div>
      </div>
      <div className="text-right flex items-center gap-2">
        <span className="text-lg font-medium">{product.price.toLocaleString('th-TH')} บาท</span>
        {isFavorite && onRemoveFavorite && (
          <Button
            variant="ghost"
            className="p-2"
            onClick={(e) => {
              e?.stopPropagation();
              onRemoveFavorite();
            }}
          >
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            className="p-2 text-red-600 hover:text-red-700"
            onClick={(e) => {
              e?.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Image Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 font-sarabun">
          <div className="relative max-w-4xl w-full mx-4">
            <Button
              onClick={closeModal}
              className="absolute top-4 right-4 rounded-full p-2 bg-gray-800 text-white hover:bg-gray-700"
              variant="ghost"
            >
              <X className="h-6 w-6" />
            </Button>
            <Button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2 bg-gray-800 text-white hover:bg-gray-700"
              variant="ghost"
              disabled={product.images.length <= 1}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 bg-gray-800 text-white hover:bg-gray-700"
              variant="ghost"
              disabled={product.images.length <= 1}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
            <img
              src={product.images[modalImageIndex] || 'https://via.placeholder.com/800x600?text=No+Image'}
              alt={`${product.title}-${modalImageIndex}`}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-gray-800 bg-opacity-50 px-3 py-1 rounded-full">
              {modalImageIndex + 1} / {product.images.length}
            </div>
          </div>
          <div
            className="absolute inset-0"
            onClick={closeModal}
          />
        </div>
      )}
    </Card>
  );
}

// Main Component
export default function Dashboard() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProductCreateModalOpen, setIsProductCreateModalOpen] = useState(false);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);

  const fetchUserListings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('กรุณาเข้าสู่ระบบ');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';
      const response = await axios.get(`${API_URL}/api/product?userId=current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setListings(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลสินค้าได้');
    }
  };

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('กรุณาเข้าสู่ระบบ');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';
      const favoritesResponse = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const favoriteIds = favoritesResponse.data.favorites;
      const favoriteProducts = await Promise.all(
        favoriteIds.map(async (id: string) => {
          const response = await axios.get(`${API_URL}/api/product/${id}`);
          return response.data;
        })
      );
      setFavorites(favoriteProducts);
    } catch (err: any) {
      setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลรายการโปรดได้');
    }
  };

  const fetchUserReviews = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('กรุณาเข้าสู่ระบบ');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';
      const response = await axios.get(`${API_URL}/api/reviews/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      setAverageRating(response.data.averageRating || 0);
      setReviewCount(response.data.reviewCount || 0);
    } catch (err: any) {
      console.error("Fetch user reviews error:", err);
      setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลรีวิวได้');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('กรุณาเข้าสู่ระบบ');
        const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';
        const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userId = userResponse.data._id;
        await Promise.all([fetchUserListings(), fetchFavorites(), fetchUserReviews(userId)]);
      } catch (err: any) {
        setError(err.response?.data?.message || 'ไม่สามารถดึงข้อมูลได้');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleAuthenticatedAction = (action: () => void) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('กรุณาเข้าสู่ระบบ');
      navigate('/login');
      return;
    }
    action();
  };

  const handleProductCreated = () => {
    setIsProductCreateModalOpen(false);
    fetchUserListings();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('กรุณาเข้าสู่ระบบ');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';
      await axios.delete(`${API_URL}/api/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setListings(listings.filter(p => p._id !== productId));
      alert('ลบสินค้าสำเร็จ');
    } catch (err: any) {
      alert(err.response?.data?.message || 'ไม่สามารถลบสินค้าได้');
    }
  };

  const handleRemoveFavorite = async (productId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('กรุณาเข้าสู่ระบบ');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';
      await axios.delete(`${API_URL}/api/favorites/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(favorites.filter(p => p._id !== productId));
      alert('ลบออกจากรายการโปรดสำเร็จ');
    } catch (err: any) {
      alert(err.response?.data?.message || 'ไม่สามารถลบออกจากรายการโปรดได้');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 font-sarabun">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-1/4 mt-6 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 font-sarabun text-center py-20">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">เกิดข้อผิดพลาด</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Button onClick={() => navigate('/browse')} className="px-6 py-2.5">
          กลับไปหน้าแรก
        </Button>
      </div>
    );
  }

  const totalViews = listings.reduce((sum, p) => sum + p.views, 0);
  const totalFavorites = favorites.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 font-sarabun">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">แดชบอร์ดของคุณ</h1>
        <Button 
          onClick={() => handleAuthenticatedAction(() => setIsProductCreateModalOpen(true))}
          className="px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" /> ลงขายสินค้าใหม่
        </Button>
      </div>

      {/* Product Create Modal */}
      <Modal
        isOpen={isProductCreateModalOpen}
        onClose={() => setIsProductCreateModalOpen(false)}
        title="ลงขายสินค้าใหม่"
      >
        <ProductCreate 
          onClose={() => setIsProductCreateModalOpen(false)} 
          onSuccess={handleProductCreated} 
        />
      </Modal>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* My Listings */}
        <Card className="bg-gray-100 p-4 rounded-lg">
          <CardHeader>
            <CardTitle>สินค้าของฉัน</CardTitle>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <p className="text-gray-500">ยังไม่มีสินค้าที่ลงขาย</p>
            ) : (
              <div className="space-y-4">
                {listings.slice(0, 3).map((product) => (
                  <div key={product._id} className="flex justify-between items-center">
                    <span 
                      className="hover:text-blue-600 cursor-pointer"
                      onClick={() => navigate(`/product/${product._id}`)}
                    >
                      {product.title}
                    </span>
                    <span className="text-sm text-gray-500">{product.price.toLocaleString('th-TH')} บาท</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Favorites */}
        <Card className="bg-gray-100 p-4 rounded-lg">
          <CardHeader>
            <CardTitle>รายการโปรด</CardTitle>
          </CardHeader>
          <CardContent>
            {favorites.length === 0 ? (
              <p className="text-gray-500">ยังไม่มีรายการโปรด</p>
            ) : (
              <div className="space-y-4">
                {favorites.slice(0, 3).map((product) => (
                  <div key={product._id} className="flex justify-between items-center">
                    <span 
                      className="hover:text-blue-600 cursor-pointer"
                      onClick={() => navigate(`/product/${product._id}`)}
                    >
                      {product.title}
                    </span>
                    <Button
                      variant="ghost"
                      className="p-2"
                      onClick={() => handleRemoveFavorite(product._id)}
                    >
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-gray-100 p-4 rounded-lg">
          <CardHeader>
            <CardTitle>สถิติโดยย่อ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>สินค้าที่ลงขาย</span>
                <span className="font-medium">{listings.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>ยอดเข้าชมทั้งหมด</span>
                <span className="font-medium">{totalViews}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>ถูกใจทั้งหมด</span>
                <span className="font-medium">{totalFavorites}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>คะแนน</span>
                <span className="font-medium">
                  {averageRating > 0 ? averageRating.toFixed(1) : "ไม่มีคะแนน"} ({reviewCount})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Products Section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">สินค้าทั้งหมดของฉัน</h2>
        {listings.length === 0 ? (
          <p className="text-gray-500 text-center py-6">ยังไม่มีสินค้าที่ลงขาย</p>
        ) : (
          <div className="space-y-4">
            {listings.map((product) => (
              <ProductItem
                key={product._id}
                product={product}
                onDelete={() => handleDeleteProduct(product._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Favorites Section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">รายการโปรดทั้งหมด</h2>
        {favorites.length === 0 ? (
          <p className="text-gray-500 text-center py-6">ยังไม่มีรายการโปรด</p>
        ) : (
          <div className="space-y-4">
            {favorites.map((product) => (
              <ProductItem
                key={product._id}
                product={product}
                isFavorite={true}
                onRemoveFavorite={() => handleRemoveFavorite(product._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
