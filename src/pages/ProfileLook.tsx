// src/pages/ProfileLook.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar, Package, MessageCircle, Eye, Heart, Share2, Flag, TrendingUp, AlertCircle, X, Filter, ChevronDown, Star
} from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  studentId?: string;
  phone?: string;
  university?: string;
  createdAt?: string;
  averageRating: number; // ✅ เพิ่ม
  reviewCount: number; // ✅ เพิ่ม
}

interface Product {
  _id: string;
  title: string;
  price: number;
  category: string;
  images: string[];
  views: number;
  favorites: string[];
  createdAt?: string;
}

interface MessageItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  likes: string[];
  comments: any[];
  views: number;
  createdAt?: string;
}

interface Review {
  _id: string;
  tradeId: string;
  productId: {
    _id: string;
    title: string;
    images: string[];
  };
  reviewerId: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  recipientId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

const formatTime = (dateString?: string) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "-";
  return formatDistanceToNow(d, { addSuffix: true, locale: th });
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Electronics":
      return "bg-purple-500";
    case "Textbooks":
      return "bg-green-500";
    case "Furniture":
      return "bg-yellow-500";
    case "Sports":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
};

const ProfileLook: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]); // ✅ เพิ่ม
  const [activeTab, setActiveTab] = useState<"products" | "messages" | "reviews">("products"); // ✅ เพิ่ม reviews
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "popular" | "price-low" | "price-high">("latest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_URL}/api/users/${id}`);
        console.log('API Response (Reviews):', res.data.reviews); // ✅ Debug
        console.log('Calling API:', `${API_URL}/api/users/${id}`); // ✅ Debug URL

      console.log('Full API Response:', res.data); // ✅ Debug response เต็ม
      console.log('API Response (Reviews):', res.data.reviews); // ✅ Debug reviews
        setProfile(res.data.user);
        setProducts(res.data.products || []);
        setMessages(res.data.messages || []);


      const reviewRes = await axios.get(`${API_URL}/api/reviews/user/${id}`);
console.log("Calling Review API:", `${API_URL}/api/reviews/user/${id}`);
console.log("Review Response:", reviewRes.data);

        setReviews(reviewRes.data.reviews);
      } catch (err: any) {
        console.error("Fetch profile look error:", err);
        setError(err.response?.data?.message || "ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const getAvatarUrl = (user: {
    avatar?: string;
    profileImage?: string;
    name: string;
  }) => {
    return (
      user.profileImage ||
      user.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.name
      )}&background=random&size=128`
    );
  };

  const getSortedProducts = () => {
    const sorted = [...products];
    switch (sortBy) {
      case "latest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
      case "oldest":
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
        );
      case "popular":
        return sorted.sort((a, b) => b.views - a.views);
      case "price-low":
        return sorted.sort((a, b) => a.price - b.price);
      case "price-high":
        return sorted.sort((a, b) => b.price - a.price);
      default:
        return sorted;
    }
  };

  const getSortedMessages = () => {
    const sorted = [...messages];
    switch (sortBy) {
      case "latest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
      case "oldest":
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
        );
      case "popular":
        return sorted.sort((a, b) => b.views - a.views);
      default:
        return sorted;
    }
  };

const getSortedReviews = () => [...reviews].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


  

  const handleShareProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShowShareMenu(false);
    }, 2000);
  };

  const handleReportProfile = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("กรุณาเข้าสู่ระบบก่อนรายงาน");
      navigate("/login");
      return;
    }
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      alert("กรุณาเลือกเหตุผลในการรายงาน");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/reports`,
        {
          type: "PROFILE",
          targetId: profile?._id,
          reason: reportReason.trim(),
          description: "รายงานโปรไฟล์ที่ไม่เหมาะสม",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("ส่งรายงานเรียบร้อยแล้ว ผู้ดูแลระบบจะตรวจสอบในเร็วๆ นี้");
      setShowReportModal(false);
      setReportReason("");
    } catch (err: any) {
      console.error("Report error:", err);
      alert(err.response?.data?.message || "ไม่สามารถส่งรายงานได้");
    }
  };

  const totalViews =
    products.reduce((sum, p) => sum + p.views, 0) +
    messages.reduce((sum, m) => sum + m.views, 0);
  const totalLikes =
    products.reduce((sum, p) => sum + p.favorites.length, 0) +
    messages.reduce((sum, m) => sum + m.likes.length, 0);

    if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-xl p-6 border">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded-xl"></div>
            <div className="h-24 bg-gray-200 rounded-xl"></div>
            <div className="h-24 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            {error || "ไม่พบโปรไฟล์"}
          </h2>
          <p className="text-gray-500 mb-6">
            โปรไฟล์ที่คุณกำลังมองหาอาจถูกลบหรือไม่มีอยู่
          </p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-900 rounded-full font-medium hover:bg-gray-200 transition-colors mx-auto"
          >
            <ArrowLeft size={16} /> กลับ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} /> กลับไปหน้าก่อนหน้า
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              <img
                src={getAvatarUrl({
                  name: profile.name,
                  avatar: (profile as any).avatar,
                  profileImage: (profile as any).profileImage,
                })}
                alt={profile.name}
                className="w-20 h-20 object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    profile.name
                  )}&background=random&size=128`;
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.name}
                </h1>
                {profile.averageRating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600">
                      {profile.averageRating.toFixed(1)} ({profile.reviewCount})
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <span>{profile.email}</span>
                </div>
                {profile.studentId && (
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span>รหัสนักศึกษา: {profile.studentId}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.university && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    <span>{profile.university}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span>เข้าร่วมเมื่อ {formatTime(profile.createdAt)}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Share2 size={16} />
                  แชร์
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={handleShareProfile}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg"
                    >
                      {copiedLink ? "✓ คัดลอกแล้ว!" : "คัดลอกลิงก์"}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleReportProfile}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Flag size={16} />
                รายงาน
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                <Package size={16} />
                <span className="text-xs">สินค้า</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                <Eye size={16} />
                <span className="text-xs">ยอดวิวรวม</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                <Heart size={16} />
                <span className="text-xs">ความสนใจ</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalLikes.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                <Star size={16} />
                <span className="text-xs">รีวิว</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{profile.reviewCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === "products"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Package size={16} /> สินค้า ({products.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === "messages"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageCircle size={16} /> ข้อความ ({messages.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`flex-1 px-6 py-4 text-sm font-medium ${
                activeTab === "reviews"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Star size={16} /> รีวิว ({reviews.length})
              </div>
            </button>
          </div>
        </div>

        {/* Sort Menu */}
        {(products.length > 0 || messages.length > 0 || reviews.length > 0) && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp size={16} />
                <span>เรียงตาม:</span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Filter size={16} />
                  {sortBy === "latest" && "ล่าสุด"}
                  {sortBy === "oldest" && "เก่าสุด"}
                  {sortBy === "popular" && "ยอดนิยม"}
                  {sortBy === "price-low" && "ราคาต่ำ → สูง"}
                  {sortBy === "price-high" && "ราคาสูง → ต่ำ"}
                  <ChevronDown size={16} />
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={() => {
                        setSortBy("latest");
                        setShowSortMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg"
                    >
                      ล่าสุด
                    </button>
                    <button
                      onClick={() => {
                        setSortBy("oldest");
                        setShowSortMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      เก่าสุด
                    </button>
                    {activeTab === "products" && (
                      <>
                        <button
                          onClick={() => {
                            setSortBy("popular");
                            setShowSortMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          ยอดนิยม
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("price-low");
                            setShowSortMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          ราคาต่ำ → สูง
                        </button>
                        <button
                          onClick={() => {
                            setSortBy("price-high");
                            setShowSortMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-b-lg"
                        >
                          ราคาสูง → ต่ำ
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {activeTab === "products" ? (
            <div>
              {products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">ยังไม่มีสินค้า</p>
                  <p className="text-sm">
                    ผู้ใช้คนนี้ยังไม่ได้โพสต์สินค้าใดๆ
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getSortedProducts().map((product) => (
                    <div
                      key={product._id}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/product/${product._id}`)}
                    >
                      <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={32} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {product.title}
                      </h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-blue-600">
                          ฿{product.price.toLocaleString("th-TH")}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full text-white ${getCategoryColor(
                            product.category
                          )}`}
                        >
                          {product.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Eye size={12} /> <span>{product.views}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart size={12} />{" "}
                            <span>{product.favorites.length}</span>
                          </div>
                        </div>
                        <span>{formatTime(product.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "messages" ? (
            <div>
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle
                    size={48}
                    className="mx-auto mb-4 text-gray-300"
                  />
                  <p className="text-lg font-medium">ยังไม่มีข้อความ</p>
                  <p className="text-sm">
                    ผู้ใช้คนนี้ยังไม่ได้โพสต์ข้อความใดๆ
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getSortedMessages().map((m) => (
                    <div
                      key={m._id}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/message/${m._id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 line-clamp-1">
                          {m.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full text-white ${getCategoryColor(
                            m.category
                          )}`}
                        >
                          {m.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {m.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Eye size={12} /> <span>{m.views}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart size={12} /> <span>{m.likes.length}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle size={12} />{" "}
                            <span>{m.comments.length}</span>
                          </div>
                        </div>
                        <span>{formatTime(m.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
<div className="space-y-4">
  {reviews && reviews.length > 0 ? (
    getSortedReviews().map((review) => (
      <div
        key={review._id}
        className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-3">
          {/* Reviewer Image */}
          <div className="flex-shrink-0">
            {review.reviewerId.profileImage ? (
              <img
                src={review.reviewerId.profileImage}
                alt={review.reviewerId.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User size={20} className="text-blue-600" />
              </div>
            )}
          </div>

          {/* Review Content */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              {/* Reviewer Name */}
              <p className="font-medium text-sm">{review.reviewerId.name}</p>
              
              {/* Star Rating */}
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    className={`${
                      star <= review.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Review Date */}
            <p className="text-xs text-gray-500 mt-1">{formatTime(review.createdAt)}</p>

            {/* Comment Box */}
            <p className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 break-words">
              {review.comment || "ไม่มีความคิดเห็น"}
            </p>

            {/* Product Name */}
            <p className="text-xs text-gray-500 mt-2">
              สินค้า: <span className="font-medium">{review.productId.title}</span>
            </p>
          </div>
        </div>
      </div>
    ))
  ) : (
    <div className="text-center py-12 text-gray-500">
      <Star size={48} className="mx-auto mb-4 text-gray-300" />
      <p className="text-lg font-medium">ยังไม่มีรีวิว</p>
      <p className="text-sm">ผู้ใช้คนนี้ยังไม่ได้รับรีวิวใดๆ</p>
    </div>
  )}
</div>




          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                รายงานโปรไฟล์ที่ไม่เหมาะสม
              </h3>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason("");
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เหตุผลในการรายงาน{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">เลือกเหตุผล</option>
                    <option value="inappropriate_content">
                      เนื้อหาไม่เหมาะสม
                    </option>
                    <option value="spam">สแปม</option>
                    <option value="fake_information">ข้อมูลปลอม</option>
                    <option value="scam">พยายามหลอกลวง</option>
                    <option value="harassment">การกลั่นแกล้ง</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle
                      size={16}
                      className="text-yellow-600 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-yellow-800">
                      การรายงานจะถูกส่งไปยังผู้ดูแลระบบเพื่อตรวจสอบ
                      กรุณารายงานเฉพาะกรณีที่มีเนื้อหาไม่เหมาะสมจริงๆ
                      เท่านั้น
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowReportModal(false);
                      setReportReason("");
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={submitReport}
                    disabled={!reportReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    ส่งรายงาน
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileLook;