import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from 'react-toastify';
import axios from "axios";
import {
  Heart,
  Share2,
  MessageCircle,
  Shield,
  ChevronRight,
  Star,
  MapPin,
  Clock,
  User,
  ArrowLeft,
  Eye,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  X,
  CheckCircle,
  Flag,
  Bookmark,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

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
  user: { 
    _id: string; 
    name: string;
    avatar?: string;
    profileImage?: string;
  };
  views: number;
  favorites: string[];
  sold: boolean;
}

// Component ปุ่มพื้นฐาน
const Button = ({
  children,
  onClick,
  className = "",
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
}) => {
  const baseClasses =
    "flex items-center justify-center font-medium rounded-lg transition-colors font-sarabun";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed",
    danger: "bg-red-100 text-red-700 hover:bg-red-200 disabled:bg-gray-100 disabled:cursor-not-allowed",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Component Badge พื้นฐาน
const Badge = ({
  children,
  className = "",
  color = "blue",
}: {
  children: React.ReactNode;
  className?: string;
  color?: "blue" | "purple" | "yellow" | "green" | "red" | "gray";
}) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
    yellow: "bg-yellow-100 text-yellow-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    gray: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-sarabun ${colorClasses[color]} ${className}`}
    >
      {children}
    </span>
  );
};

const Card = ({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
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
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-4 ${className}`}>{children}</div>;

const CardTitle = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <h3 className={`font-medium font-sarabun ${className}`}>{children}</h3>;

const CardContent = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-4 pt-0 ${className}`}>{children}</div>;

// ✅ Helper function to get avatar URL
const getAvatarUrl = (user: { avatar?: string; profileImage?: string; name: string }) => {
  return user.profileImage || user.avatar || 
         `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128`;
};

// Component Gallery สำหรับแสดงรูปภาพ
function Gallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadingBookmark, setLoadingBookmark] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
        const response = await axios.get(`${API_URL}/api/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsBookmarked(response.data.favorites.includes(product._id));
      } catch (err) {
        console.error("Fetch favorite status error:", err);
      }
    };
    fetchFavoriteStatus();
  }, [product._id]);

  const handleToggleBookmark = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.info("กรุณาเข้าสู่ระบบก่อนบันทึกสินค้า");
      navigate("/login");
      return;
    }

    setLoadingBookmark(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
      if (isBookmarked) {
        await axios.delete(`${API_URL}/api/favorites/${product._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsBookmarked(false);
        toast.success("ลบออกจากรายการโปรดแล้ว");
      } else {
        await axios.post(
          `${API_URL}/api/favorites`,
          { productId: product._id },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setIsBookmarked(true);
        toast.success("เพิ่มในรายการโปรดแล้ว");
      }
    } catch (err: any) {
      console.error("Toggle bookmark error:", err);
      if (err.response?.status === 401) {
        toast.error("กรุณาเข้าสู่ระบบอีกครั้ง");
        navigate("/login");
      } else {
        toast.error(err.response?.data?.message || "ไม่สามารถเพิ่ม/ลบรายการโปรดได้");
      }
    } finally {
      setLoadingBookmark(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: product.description,
          url: window.location.href,
        });
        toast.success("แชร์สำเร็จ!");
      } catch (err) {
        console.error("Share error:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("คัดลอกลิงก์สำเร็จ!");
      } catch (err) {
        console.error("Copy error:", err);
        toast.error("ไม่สามารถคัดลอกลิงก์ได้");
      }
    }
  };

  const openModal = (index: number) => {
    setModalImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const nextImage = () => {
    setModalImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setModalImageIndex(
      (prev) => (prev - 1 + product.images.length) % product.images.length
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, product.images.length]);

  // ✅ ป้องกันกรณีไม่มีรูปภาพ
  const displayImages = product.images.length > 0 
    ? product.images 
    : ["https://via.placeholder.com/400x300?text=No+Image"];

  return (
    <div className="space-y-4 font-sarabun">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-100 shadow">
        <img
          src={displayImages[active]}
          alt={product.title}
          className="h-full w-full object-cover cursor-pointer"
          onClick={() => openModal(active)}
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/400x300?text=Image+Error";
          }}
        />

        {/* ✅ ปุ่ม Share + Bookmark */}
        <div className="absolute left-3 top-3 flex gap-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="rounded-full shadow p-2 bg-white hover:bg-gray-100"
            variant="secondary"
          >
            <Share2 className="h-4 w-4 text-gray-700" />
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleBookmark();
            }}
            className="rounded-full shadow p-2 bg-white hover:bg-gray-100"
            variant="secondary"
            disabled={loadingBookmark}
          >
            <Bookmark
              className={`h-4 w-4 transition-colors ${
                isBookmarked ? "fill-blue-600 text-blue-600" : "text-gray-700"
              }`}
            />
          </Button>
        </div>

        {/* Badge หมวดหมู่ + สถานะขายแล้ว */}
        <div className="absolute right-3 top-3 flex flex-col gap-1">
          <Badge
            color={
              product.category === "electronics"
                ? "purple"
                : product.category === "furniture"
                ? "yellow"
                : product.category === "textbooks"
                ? "green"
                : "blue"
            }
          >
            {product.category === "electronics"
              ? "เครื่องใช้ไฟฟ้า"
              : product.category === "furniture"
              ? "เฟอร์นิเจอร์"
              : product.category === "textbooks"
              ? "หนังสือเรียน"
              : product.category === "sports"
              ? "กีฬา"
              : "อื่นๆ"}
          </Badge>

          {/* ✅ Badge ขายแล้ว */}
          {product.sold && (
            <Badge
              color="red"
              className="bg-red-500 text-white font-semibold shadow-lg border border-red-300"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              ขายแล้ว
            </Badge>
          )}
        </div>
      </div>

      {/* Thumbnails - ✅ แสดงเฉพาะเมื่อมีหลายรูป */}
      {displayImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {displayImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`aspect-[4/3] overflow-hidden rounded-xl border transition-all ${
                active === i ? "ring-2 ring-blue-600" : "hover:opacity-90"
              }`}
            >
              <img
                src={img}
                alt={`thumb-${i}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/100x75?text=Error";
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 font-sarabun"
          onClick={closeModal}
        >
          <div
            className="relative flex max-w-6xl w-full h-screen bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 flex items-center justify-center relative bg-black">
              <Button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2 bg-gray-800 text-white hover:bg-gray-700"
                variant="ghost"
                disabled={displayImages.length <= 1}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <img
                src={displayImages[modalImageIndex]}
                alt={`${product.title}-${modalImageIndex}`}
                className="max-h-[85vh] object-contain rounded"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/800x600?text=Image+Error";
                }}
              />

              <Button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 bg-gray-800 text-white hover:bg-gray-700"
                variant="ghost"
                disabled={displayImages.length <= 1}
              >
                <ChevronRightIcon className="h-6 w-6" />
              </Button>

              <Button
                onClick={closeModal}
                className="absolute top-4 right-4 rounded-full p-2 bg-gray-800 text-white hover:bg-gray-700"
                variant="ghost"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Thumbnail แนวตั้งด้านขวา - ✅ แสดงเฉพาะเมื่อมีหลายรูป */}
            {displayImages.length > 1 && (
              <div className="w-28 bg-white overflow-y-auto p-2 flex flex-col gap-2 border-l">
                {displayImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`thumb-${idx}`}
                    className={`w-full h-20 object-cover rounded cursor-pointer border-2 transition ${
                      idx === modalImageIndex
                        ? "border-blue-500"
                        : "border-transparent hover:border-gray-300"
                    }`}
                    onClick={() => setModalImageIndex(idx)}
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/100x75?text=Error";
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Component Breadcrumbs
function Breadcrumbs({ product }: { product: Product }) {
  const categoryName =
    {
      electronics: "เครื่องใช้ไฟฟ้า",
      furniture: "เฟอร์นิเจอร์",
      textbooks: "หนังสือเรียน",
      sports: "กีฬา",
      other: "อื่นๆ",
    }[product.category] || "อื่นๆ";

  const items = ["หน้าแรก", "หมวดหมู่", categoryName, product.title];
  return (
    <nav className="mb-6 flex items-center gap-1 text-sm text-gray-500 font-sarabun">
      {items.map((x, i) => (
        <React.Fragment key={x}>
          {i === 0 ? (
            <Link to="/browse" className="hover:text-gray-900">
              {x}
            </Link>
          ) : (
            <span
              className={`hover:text-gray-900 ${
                i === items.length - 1
                  ? "font-medium text-gray-900 truncate"
                  : ""
              }`}
            >
              {i === items.length - 1 && x.length > 30
                ? `${x.substring(0, 30)}...`
                : x}
            </span>
          )}
          {i < items.length - 1 && (
            <ChevronRight className="mx-1 h-4 w-4 flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// Component SellerPanel
function SellerPanel({ product }: { product: Product }) {
  const navigate = useNavigate();
  const [loadingChat, setLoadingChat] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
const [reportReason, setReportReason] = useState("");
  const [averageRating, setAverageRating] = useState<number>(0); // State สำหรับ Rating
  const [reviewCount, setReviewCount] = useState<number>(0);   // State สำหรับ Review Count


useEffect(() => {
    const fetchUserReviews = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
        const response = await axios.get(`${API_URL}/api/reviews/user/${product.user._id}`);
        
        // --- START FIX: คำนวณ Rating และ Count จาก List Reviews พร้อมการกรอง ---
        let reviewsData: any[] = []; 
        
        // จัดการรูปแบบ Response
        if (Array.isArray(response.data)) {
          reviewsData = response.data;
        } else if (response.data && Array.isArray(response.data.reviews)) {
          reviewsData = response.data.reviews;
        } 
        
        // **✅ เพิ่ม: กรองรีวิวที่สินค้าถูกลบ (productId เป็น null หรือไม่มี _id)**
        const filteredReviewsData = reviewsData.filter(
            (review) => review.productId && review.productId._id
        );
        
        const calculatedReviewCount = filteredReviewsData.length;
        let calculatedAverageRating = 0;
        
        if (calculatedReviewCount > 0) {
            // คำนวณผลรวม Rating และหาค่าเฉลี่ยจากข้อมูลที่กรองแล้ว
            const totalRating = filteredReviewsData.reduce((sum, review) => sum + (review.rating || 0), 0);
            calculatedAverageRating = totalRating / calculatedReviewCount;
        }
        
        // อัปเดต State ด้วยค่าที่คำนวณได้
        setAverageRating(calculatedAverageRating);
        setReviewCount(calculatedReviewCount);
        // --- END FIX ---
        
      } catch (err) {
        console.error("Fetch user reviews error:", err);
        // ตั้งค่าเป็น 0 เมื่อเกิดข้อผิดพลาดในการดึงข้อมูล
        setAverageRating(0);
        setReviewCount(0);
      }
    };
    fetchUserReviews();
  }, [product.user._id]);
  const getConditionText = (condition: string) => {
    switch (condition) {
      case "new":
        return "ใหม่";
      case "used_like_new":
        return "มือสอง - เหมือนใหม่";
      case "used_good":
        return "มือสอง - สภาพดี";
      case "used_fair":
        return "มือสอง - พอใช้";
      default:
        return "ไม่ทราบ";
    }
  };

  const handleContactSeller = async () => {
    setLoadingChat(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.info("กรุณาเข้าสู่ระบบก่อนเริ่มการสนทนา");
        navigate("/login");
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
      const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const currentUserId = userResponse.data._id;

      if (currentUserId === product.user._id) {
        toast.info("ไม่สามารถแชทกับตัวเองได้");
        return;
      }

      const conversationResponse = await axios.post(
        `${API_URL}/api/conversations/product/${product._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate(`/chat/${conversationResponse.data.conversation._id}`);
    } catch (err: any) {
      console.error("Contact seller error:", err);
      if (err.response?.status === 401) {
        toast.error("กรุณาเข้าสู่ระบบก่อนเริ่มการสนทนา");
        navigate("/login");
      } else {
        toast.error(err.response?.data?.message || "ไม่สามารถเริ่มการสนทนาได้");
      }
    } finally {
      setLoadingChat(false);
    }
  };

  const handleReport = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.info("กรุณาเข้าสู่ระบบก่อนรายงาน");
      navigate("/login");
      return;
    }
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      toast.warning("กรุณาเลือกเหตุผลในการรายงาน");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";

      await axios.post(
        `${API_URL}/api/reports`,
        {
          type: "PRODUCT",
          targetId: product._id,
          reason: reportReason.trim(),
          description: "รายงานสินค้าที่ไม่เหมาะสม",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("ส่งรายงานเรียบร้อยแล้ว ผู้ดูแลระบบจะตรวจสอบในเร็วๆ นี้");
      setShowReportModal(false);
      setReportReason("");
    } catch (err: any) {
      console.error("Report error:", err);
      toast.error(err.response?.data?.message || "ไม่สามารถส่งรายงานได้");
    }
  };

  return (
    <>
      <Card className="sticky top-6 rounded-2xl font-sarabun">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">
            {product.category === "electronics"
              ? "เครื่องใช้ไฟฟ้า"
              : product.category === "furniture"
              ? "เฟอร์นิเจอร์"
              : product.category === "textbooks"
              ? "หนังสือเรียน"
              : product.category === "sports"
              ? "กีฬา"
              : "อื่นๆ"}
          </CardTitle>

          {/* ✅ ชื่อสินค้า + สถานะ */}
          <div className="flex items-center gap-2 mb-3">
            <div className="text-2xl font-semibold flex items-center gap-2">
              {product.title}
              {product.sold && (
                <span className="text-sm text-red-500 font-normal">
                  (ขายแล้ว)
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ✅ Banner ขายแล้ว */}
          {product.sold && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  <CheckCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-900 mb-1 text-lg">
                    สินค้าขายแล้ว
                  </h4>
                  <p className="text-sm text-red-800">
                    สินค้านี้ถูกทำเครื่องหมายว่าขายเรียบร้อยแล้ว
                    <span className="font-medium">
                      {" "}
                      ไม่สามารถซื้อได้อีกต่อไป
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ✅ ราคา + สภาพ */}
          <div
            className={`text-3xl font-bold ${
              product.sold ? "text-gray-400 line-through" : "text-gray-900"
            }`}
          >
            {product.price.toLocaleString("th-TH")} บาท
          </div>
          {!product.sold && (
            <div className="mt-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
                {getConditionText(product.condition)}
              </span>
            </div>
          )}

          {/* ✅ คำอธิบายสินค้า */}
          {!product.sold && (
            <div className="space-y-2 text-sm">
              <div className="font-semibold text-gray-900">คำอธิบาย</div>
              <p className="whitespace-pre-line leading-relaxed text-gray-600">
                {product.description}
              </p>
            </div>
          )}

          {/* ✅ การรับประกัน */}
          <div
            className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
              product.sold
                ? "bg-gray-50 text-gray-600"
                : "bg-green-50 text-green-800"
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>
              {product.sold
                ? "ปลอดภัย 100% เมื่อพบหน้าในมหาวิทยาลัย"
                : "ปลอดภัยเมื่อพบหน้าในมหาวิทยาลัย"}
            </span>
          </div>

          {/* ✅ ข้อมูลผู้ขาย */}
          {!product.sold && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border p-3">
                {/* ✅ แสดง Avatar ของผู้ขาย - เพิ่ม onClick เพื่อไปยังโปรไฟล์ */}
                <img
                  src={getAvatarUrl(product.user)}
                  alt={product.user.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/profile/${product.user._id}`)}
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.user.name)}&background=random&size=128`;
                  }}
                />
                <div className="flex-1">
                  {/* ✅ เพิ่ม onClick ให้ชื่อผู้ขายเพื่อไปยังโปรไฟล์ */}
                  <div 
                    className="text-sm font-medium cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => navigate(`/profile/${product.user._id}`)}
                  >
                    {product.user.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    นักศึกษามหาวิทยาลัย
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                   <span>
    {averageRating > 0 ? averageRating.toFixed(1) : "ไม่มีคะแนน"} ({reviewCount} รีวิว)
  </span>
                  </div>
                </div>
              </div>

              {/* ✅ ปุ่มแชท + รายงาน */}
              <div className="flex gap-2">
                <Button
                  onClick={handleContactSeller}
                  className="flex-1 px-4 py-2.5"
                  disabled={loadingChat}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {loadingChat ? "กำลังโหลด..." : "แชทกับผู้ขาย"}
                </Button>
                <Button
                  onClick={handleReport}
                  className="px-4 py-2.5"
                  variant="danger"
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ✅ ข้อมูลเพิ่มเติม */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between py-2 text-sm text-gray-600">
              <div className="flex items-center gap-2 text-gray-900">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>สถานที่นัดรับ</span>
              </div>
              <span className="font-normal text-gray-600 truncate max-w-[50%]">
                {product.location}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 text-sm text-gray-700 border-t border-gray-100">
              <div className="flex items-center gap-2 text-gray-900">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>ลงขายเมื่อ</span>
              </div>
              <span className="font-normal text-gray-600">
                {formatDistanceToNow(new Date(product.createdAt), {
                  addSuffix: true,
                  locale: th,
                })}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 text-sm text-gray-700 border-t border-gray-100">
              <div className="flex items-center gap-2 text-gray-900">
                <Eye className="h-4 w-4 text-gray-500" />
                <span>ยอดเข้าชม</span>
              </div>
              <span className="font-normal text-gray-600">
                {product.views.toLocaleString("th-TH")} ครั้ง
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                รายงานสินค้าที่ไม่เหมาะสม
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
                    เหตุผลในการรายงาน <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">เลือกเหตุผล</option>
                    <option value="inappropriate_content">เนื้อหาไม่เหมาะสม</option>
                    <option value="spam">สแปม</option>
                    <option value="fake_information">ข้อมูลปลอม</option>
                    <option value="scam">พยายามหลอกลวง</option>
                    <option value="prohibited_items">สินค้าต้องห้าม</option>
                    <option value="harassment">การกลั่นแกล้ง</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800">
                      การรายงานจะถูกส่งไปยังผู้ดูแลระบบเพื่อตรวจสอบ 
                      กรุณารายงานเฉพาะกรณีที่มีเนื้อหาไม่เหมาะสมจริงๆ เท่านั้น
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
    </>
  );
}

// Component RelatedList
function RelatedList({ currentProduct }: { currentProduct: Product }) {
  const navigate = useNavigate();
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
        const response = await axios.get(`${API_URL}/api/product`, {
          params: {
            category: currentProduct.category,
            sold: false,
          },
        });
        const products = response.data
          .filter((p: Product) => p._id !== currentProduct._id)
          .slice(0, 6);
        setRelatedProducts(products);
        setLoading(false);
      } catch (err) {
        console.error("Fetch related products error:", err);
        setLoading(false);
      }
    };
    fetchRelatedProducts();
  }, [currentProduct._id, currentProduct.category]);

  if (loading) {
    return (
      <section className="mt-12">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-2xl"></div>
              ))}
          </div>
        </div>
      </section>
    );
  }

  if (relatedProducts.length === 0) {
    return (
      <section className="mt-12 text-center py-6">
        <p className="text-sm text-gray-500 font-sarabun">
          ไม่มีสินค้าในหมวด{" "}
          {currentProduct.category === "electronics"
            ? "เครื่องใช้ไฟฟ้า"
            : currentProduct.category === "furniture"
            ? "เฟอร์นิเจอร์"
            : currentProduct.category === "textbooks"
            ? "หนังสือเรียน"
            : currentProduct.category === "sports"
            ? "กีฬา"
            : "อื่นๆ"}{" "}
          อื่นๆ ในขณะนี้
        </p>
      </section>
    );
  }

  const getCategoryColor = (
    category: string
  ): "blue" | "purple" | "yellow" | "green" => {
    switch (category) {
      case "electronics":
        return "purple";
      case "furniture":
        return "yellow";
      case "textbooks":
        return "green";
      default:
        return "blue";
    }
  };

  const handleContactSeller = async (product: Product) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.info("กรุณาเข้าสู่ระบบก่อนเริ่มการสนทนา");
        navigate("/login");
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";

      const conversationResponse = await axios.post(
        `${API_URL}/api/conversations/product/${product._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate(`/chat/${conversationResponse.data.conversation._id}`);
    } catch (err: any) {
      console.error("Contact seller error:", err);
      if (err.response?.status === 401) {
        toast.error("กรุณาเข้าสู่ระบบก่อนเริ่มการสนทนา");
        navigate("/login");
      } else {
        toast.error(err.response?.data?.message || "ไม่สามารถเริ่มการสนทนาได้");
      }
    }
  };

  return (
    <section className="mt-12 font-sarabun">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-semibold">สินค้าที่เกี่ยวข้อง</h3>
        <Link
          to={`/browse?category=${currentProduct.category}`}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ดูทั้งหมด
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {relatedProducts.map((product) => (
          <Card
            key={product._id}
            className="group rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
            onClick={() => navigate(`/product/${product._id}`)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-gray-100">
                <img
                  src={
                    product.images[0] ||
                    "https://via.placeholder.com/400x300?text=No+Image"
                  }
                  alt={product.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/400x300?text=Image+Error";
                  }}
                />
                <div className="absolute left-3 top-3">
                  <Badge
                    color={getCategoryColor(product.category)}
                    className="rounded-full text-xs font-medium shadow-sm"
                  >
                    {product.category === "electronics"
                      ? "เครื่องใช้ไฟฟ้า"
                      : product.category === "furniture"
                      ? "เฟอร์นิเจอร์"
                      : product.category === "textbooks"
                      ? "หนังสือเรียน"
                      : product.category === "sports"
                      ? "กีฬา"
                      : "อื่นๆ"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {product.title}
                </div>

                <div className="text-sm text-gray-500 line-clamp-2">
                  {product.description}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-blue-600">
                    {product.price.toLocaleString("th-TH")} บาท
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDistanceToNow(new Date(product.createdAt), {
                        addSuffix: true,
                        locale: th,
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {product.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {/* ✅ เพิ่ม onClick ให้ชื่อผู้ขายเพื่อไปยังโปรไฟล์ */}
                  <div 
                    className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${product.user._id}`);
                    }}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>{product.user.name}</span>
                  </div>
                  <Button
                    variant="secondary"
                    className="text-xs px-3 py-1.5 h-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContactSeller(product);
                    }}
                  >
                    แชท
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

// Main Component
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProduct= async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
        const response = await axios.get(`${API_URL}/api/product/${id}`);
        setProduct(response.data);
        
        // ✅ บันทึกยอดเข้าชม
        try {
          await axios.post(`${API_URL}/api/products /${id}/view`);
        } catch (viewErr) {
        //  console.error("View tracking error:", viewErr);
          // ไม่ต้อง throw error เพราะไม่สำคัญมาก
        }
        
        setLoading(false);
      } catch (err: any) {

        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 font-sarabun">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="h-96 bg-gray-200 rounded-2xl"></div>
            <div className="h-96 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 font-sarabun">
        <div className="text-center py-20">
          <AlertCircle size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            ไม่พบสินค้าที่ต้องการ
          </h2>
          <p className="text-gray-500 mb-6">
            {error || "สินค้าที่คุณกำลังมองหาอาจถูกลบหรือไม่มีอยู่"}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate(-1)}
              variant="secondary"
              className="px-6 py-2.5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับไปหน้าก่อนหน้า
            </Button>
            <Link to="/browse">
              <Button className="px-6 py-2.5">เรียกดูสินค้าทั้งหมด</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 font-sarabun">
      <div className="mb-4">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="px-2 py-1 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับไปหน้าก่อนหน้า
        </Button>
      </div>

      <Breadcrumbs product={product} />

      <div className="grid gap-8 lg:grid-cols-2">
        <Gallery product={product} />
        <SellerPanel product={product} />
      </div>

      <RelatedList currentProduct={product} />
    </div>
  );
}