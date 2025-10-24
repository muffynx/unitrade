// src/pages/admin/AdminProducts.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { FaTrashAlt, FaEye, FaHeart, FaSyncAlt } from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Search,
  Calendar,
  Clock,
  User as UserIcon,
  MapPin,
  Tag,
  Package,
  AlertCircle,
  X,
  DollarSign,
} from "lucide-react";

interface Product {
  _id: string;
  title: string;
  price: number;
  category: string;
  description: string;
  condition: string;
  location: string;
  images: string[];
  user: {
    name: string;
    email: string;
    _id: string;
    avatar?: string;
    profileImage?: string;
  };
  createdAt: string;
  views: number;
  favorites: string[];
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

type CategoryFilter = "all" | string;
type ConditionFilter = "all" | "new" | "like-new" | "good" | "fair";

// ✅ Helper function to get avatar URL
const getAvatarUrl = (user: { name: string; avatar?: string; profileImage?: string }) => {
  // 1. ลองใช้ profileImage
  if (user.profileImage) return user.profileImage;
  // 2. ลองใช้ avatar
  if (user.avatar) return user.avatar;
  // 3. ถ้าไม่มีเลย ส่ง URL UI-Avatars กลับไป
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128`;
};

export default function AdminProducts() {
  const [activePage, setActivePage] = useState<"dashboard" | "users" | "products">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>("all");

  const API_URL = import.meta.env.VITE_API_URL || "https://unitrade2.onrender.com";
  const token = localStorage.getItem("adminToken");

  // ✅ Custom function for error handling on user image loading
  // ถ้าการโหลดรูปภาพจาก Server ล้มเหลว (เช่น ลิงก์เสีย) ให้เปลี่ยน src ไปเป็น UI-Avatars
  const handleUserImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, name: string) => {
    // ป้องกันการวนซ้ำไม่รู้จบถ้า even handler ถูกเรียกซ้ำ ๆ
    if (e.currentTarget.src.includes('ui-avatars.com')) return; 
    
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
  };

  // Toast Notification
  const showToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // โหลดสินค้าจาก API
  const fetchProducts = async () => {
    if (!token) {
      setError("ไม่พบ Admin Token");
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถโหลดรายการสินค้าได้");
      showToast("ไม่สามารถโหลดรายการสินค้าได้", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, categoryFilter, conditionFilter]);

  const filterProducts = () => {
    let filtered = [...products];

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Filter by condition
    if (conditionFilter !== "all") {
      filtered = filtered.filter((p) => p.condition === conditionFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.user.name.toLowerCase().includes(query) ||
          p.user.email.toLowerCase().includes(query) ||
          p.location.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  };

  // สร้างหรือดึง Conversation กับผู้ใช้
  const createOrGetAdminChat = async (userId: string) => {
    try {
      const res = await axios.post(
        `${API_URL}/api/conversations/admin-chat`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data.conversation || null;
    } catch (err: any) {
      console.error("Cannot create/get admin chat", err.response?.data || err);
      return null;
    }
  };

  // ส่งข้อความ Admin ไปผู้ใช้
  const sendAdminMessage = async (conversationId: string, message: string) => {
    if (!conversationId) return false;
    try {
      await axios.post(
        `${API_URL}/api/conversations/${conversationId}/admin-messages`,
        { content: message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (err: any) {
      console.error("Cannot send admin message", err.response?.data || err);
      return false;
    }
  };

  // ลบสินค้า + แจ้งผู้ใช้
  const handleDelete = async (productId: string, ownerId: string, productTitle: string) => {
    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${productTitle}"?\n\nผู้ใช้จะได้รับการแจ้งเตือนผ่านระบบแชท`
      )
    )
      return;

    setDeletingProductId(productId);

    try {
      // ลบสินค้า
      await axios.delete(`${API_URL}/api/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let notificationSent = false;

      // สร้างหรือดึง conversation และส่งข้อความแจ้งผู้ใช้
      if (ownerId) {
        const conversation = await createOrGetAdminChat(ownerId);

        if (conversation?._id) {
          notificationSent = await sendAdminMessage(
            conversation._id,
            `สินค้าของคุณถูกลบ\n\n` +
              `สินค้า: ${productTitle}\n` +
              `เหตุผล: เนื้อหาไม่เป็นไปตามนโยบายของแพลตฟอร์ม\n\n` +
              `หากคุณคิดว่ามีข้อผิดพลาดหรือต้องการทราบรายละเอียดเพิ่มเติม กรุณาติดต่อทีมสนับสนุนของเรา\n\n` +
              `ขอขอบคุณที่ใช้บริการของเรา`
          );
        }
      }

      // อัปเดต state
      setProducts((prev) => prev.filter((p) => p._id !== productId));
      setShowDetailModal(false);

      if (notificationSent) {
        showToast(`ลบสินค้า "${productTitle}" สำเร็จและแจ้งผู้ใช้แล้ว`, "success");
      } else {
        showToast(`ลบสินค้า "${productTitle}" สำเร็จ`, "success");
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      const errorMessage = err.response?.data?.message || "ลบสินค้าไม่สำเร็จ";
      showToast(errorMessage, "error");
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchProducts();
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Get unique categories
  const categories = Array.from(new Set(products.map((p) => p.category)));

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case "new":
        return "ใหม่";
      case "used_like_new":
        return "เหมือนใหม่";
      case "used_good":
        return "ดี";
      case "used-fair":
        return "พอใช้";
      default:
        return condition;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "new":
        return "bg-green-100 text-green-800 border-green-200";
      case "used_like_new":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "used_good":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "used-fair":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const stats = {
    total: products.length,
    totalValue: products.reduce((sum, p) => sum + p.price, 0),
    totalViews: products.reduce((sum, p) => sum + p.views, 0),
    totalFavorites: products.reduce((sum, p) => sum + (p.favorites?.length || 0), 0),
  };

  return (
    <AdminLayout activePage={activePage} setActivePage={setActivePage}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">จัดการสินค้า</h1>
            <p className="text-gray-500 mt-1">ตรวจสอบและจัดการสินค้าจากผู้ใช้งาน</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm border border-gray-200 hover:shadow-md disabled:opacity-50 text-sm"
          >
            <FaSyncAlt className={`${loading ? "animate-spin" : ""}`} size={16} />
            {loading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">สินค้าทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">มูลค่ารวม</p>
                <p className="text-2xl font-bold text-green-600">
                  ฿{stats.totalValue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ยอดวิวรวม</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalViews.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaEye className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ถูกใจรวม</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalFavorites.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <FaHeart className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อสินค้า, ผู้ขาย, สถานที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">หมวดหมู่ทั้งหมด</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Condition Filter */}
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value as ConditionFilter)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">สภาพทั้งหมด</option>
              <option value="new">ใหม่</option>
              <option value="like-new">เหมือนใหม่</option>
              <option value="good">ดี</option>
              <option value="fair">พอใช้</option>
            </select>
          </div>
        </div>
{/* ================= Mobile/iPad Card List (แทนที่ table) ================= */}
        <div className="lg:hidden flex flex-col gap-2 p-2">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-50 border border-red-200 p-6 rounded-xl m-6 flex items-center gap-3">
              <AlertCircle size={24} />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-sm text-red-500 mt-1">กรุณาลองใหม่อีกครั้ง</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="h-10 w-10 text-gray-400 mb-3 mx-auto" />
              <p className="text-gray-500 text-lg font-medium">ไม่พบสินค้า</p>
              <p className="text-gray-400 text-sm mt-1">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div
                key={product._id}
                className="border rounded-lg p-3 flex flex-col gap-2 bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={product.images?.[0] || "https://via.placeholder.com/300x200?text=No+Image"}
                      alt={product.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 text-base line-clamp-2">{product.title}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{product.description}</div>
                    <div className="text-xs mt-1 text-gray-600 flex gap-2">
                      <span className="inline-flex gap-1 items-center"><Tag size={12} />{product.category}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${getConditionColor(product.condition)}`}>
                        {getConditionLabel(product.condition)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs gap-2">
                  <div className="flex items-center gap-1">
                    <FaEye size={12} />
                    {product.views}
                    <FaHeart size={12} className="ml-2 text-red-400" />
                    {product.favorites?.length || 0}
                  </div>
                  <div className="font-bold text-green-700">฿{product.price.toLocaleString()}</div>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowDetailModal(true);
                    }}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    <FaEye className="h-3 w-3 mr-1" /> ดู
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {/* ============ Desktop Table ============= */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-50 border border-red-200 p-6 rounded-xl m-6 flex items-center gap-3">
              <AlertCircle size={24} />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-sm text-red-500 mt-1">กรุณาลองใหม่อีกครั้ง</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สินค้า
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้ขาย
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หมวดหมู่
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สภาพ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ราคา
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถิติ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่ลงขาย
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                      {/* Product Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img
                              src={
                                product.images?.[0] ||
                                "https://via.placeholder.com/300x200?text=No+Image"
                              }
                              alt={product.title}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="max-w-xs">
                            <div className="font-medium text-gray-900 line-clamp-2">
                              {product.title}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Seller Info (ใช้ getAvatarUrl) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            src={getAvatarUrl(product.user)} 
                            alt={product.user.name}
                            className="h-9 w-9 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                            onError={(e) => handleUserImageError(e, product.user.name)} 
                          />
                          <div>
                            <div className="font-medium text-gray-900 line-clamp-1">
                              {product.user?.name || "ไม่ระบุชื่อ"}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {product.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                          <Tag size={12} />
                          {product.category}
                        </span>
                      </td>
                      {/* Condition */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getConditionColor(
                            product.condition
                          )}`}
                        >
                          {getConditionLabel(product.condition)}
                        </span>
                      </td>
                      {/* Price */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">
                          ฿{product.price.toLocaleString()}
                        </div>
                      </td>
                      {/* Stats */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <FaEye size={12} />
                            <span className="font-medium">{product.views} วิว</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FaHeart size={12} className="text-red-400" />
                            <span className="font-medium">{product.favorites?.length || 0} ถูกใจ</span>
                          </div>
                        </div>
                      </td>
                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(product.createdAt).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(product.createdAt).toLocaleTimeString("th-TH", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDetailModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                        >
                          <FaEye className="h-3 w-3" />
                          ดู
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Package className="h-12 w-12 text-gray-400 mb-3" />
                          <p className="text-gray-500 text-lg font-medium">ไม่พบสินค้า</p>
                          <p className="text-gray-400 text-sm mt-1">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
              <h3 className="text-xl font-semibold text-gray-900">รายละเอียดสินค้า</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 p-2 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="ปิด"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Product Images */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <label className="lg:col-span-4 text-xs font-medium text-gray-500 mb-1">รูปภาพสินค้า ({selectedProduct.images.length} รูป)</label>
                  {selectedProduct.images.map((image, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                      <img
                        src={image || "https://via.placeholder.com/300x200?text=No+Image"}
                        alt={`${selectedProduct.title} - ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Product Info main block */}
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Left Column (Title, Price, Description) */}
                <div className="space-y-4">
                    {/* Title & Price */}
                    <div>
                        <label className="text-sm font-medium text-gray-500">ชื่อสินค้า</label>
                        <h2 className="mt-1 text-2xl font-bold text-gray-900">{selectedProduct.title}</h2>
                        <p className="mt-2 text-3xl font-bold text-green-600">
                            ฿{selectedProduct.price.toLocaleString()}
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-medium text-gray-500">รายละเอียด</label>
                        <p className="mt-2 text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner max-h-56 overflow-y-auto">
                            {selectedProduct.description}
                        </p>
                    </div>

                    {/* Date/Time */}
                    <div>
                        <label className="text-sm font-medium text-gray-500">วันที่และเวลาลงขาย</label>
                        <div className="mt-2 text-gray-700 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-3">
                            <Calendar size={18} className="text-gray-500"/>
                             {new Date(selectedProduct.createdAt).toLocaleString("th-TH", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column (Seller, Attributes, Stats) */}
                <div className="space-y-4">
                    
                    {/* Seller Info (ใช้ getAvatarUrl) */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <label className="text-sm font-medium text-blue-800">ผู้ขาย</label>
                        <div className="mt-3 flex items-center gap-3">
                            <img
                                src={getAvatarUrl(selectedProduct.user)} 
                                alt={selectedProduct.user.name}
                                className="h-14 w-14 rounded-full object-cover border-4 border-white shadow-md flex-shrink-0"
                                onError={(e) => handleUserImageError(e, selectedProduct.user.name)} 
                            />
                            <div>
                                <p className="font-semibold text-gray-900 text-lg line-clamp-1">
                                    {selectedProduct.user?.name || "ไม่ระบุชื่อ"}
                                </p>
                                <p className="text-sm text-blue-600 line-clamp-1">{selectedProduct.user?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Attributes (Category, Condition, Location) */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Category */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="text-xs font-medium text-gray-500 block">หมวดหมู่</label>
                            <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <Tag size={12} />
                                    {selectedProduct.category}
                                </span>
                            </div>
                        </div>

                        {/* Condition */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="text-xs font-medium text-gray-500 block">สภาพ</label>
                            <div className="mt-1">
                            <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getConditionColor(
                                selectedProduct.condition
                                )}`}
                            >
                                {getConditionLabel(selectedProduct.condition)}
                            </span>
                            </div>
                        </div>

                        {/* Location */}
                         <div className="col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="text-xs font-medium text-gray-500 block">สถานที่</label>
                            <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                                <MapPin size={12} />
                                {selectedProduct.location}
                            </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                        <label className="text-sm font-medium text-gray-700 mb-3 block">สถิติความสนใจ</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm">
                                <FaEye size={20} className="text-purple-600" />
                                <div>
                                    <p className="text-xs text-gray-500">ยอดวิว</p>
                                    <p className="text-lg font-bold text-gray-900">{selectedProduct.views.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm">
                                <FaHeart size={20} className="text-red-600" />
                                <div>
                                    <p className="text-xs text-gray-500">ถูกใจ</p>
                                    <p className="text-lg font-bold text-gray-900">
                                    {selectedProduct.favorites?.length.toLocaleString() || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>

              {/* Delete Action (Bottom sticky-like footer) */}
              <div className="pt-6 border-t border-gray-200">
                <label className="text-sm font-medium text-gray-700 mb-3 block">การดำเนินการสำหรับผู้ดูแลระบบ</label>
                <button
                  onClick={() =>
                    handleDelete(
                      selectedProduct._id,
                      selectedProduct.user?._id || "",
                      selectedProduct.title
                    )
                  }
                  disabled={deletingProductId === selectedProduct._id}
                  className={`w-full font-medium py-3 rounded-xl flex justify-center items-center gap-2 transition-all duration-200 shadow-lg ${
                    deletingProductId === selectedProduct._id
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {deletingProductId === selectedProduct._id ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      กำลังลบสินค้าและแจ้งผู้ใช้...
                    </>
                  ) : (
                    <>
                      <FaTrashAlt size={16} />
                      ลบสินค้าและแจ้งเตือนผู้ใช้ (ขั้นเด็ดขาด)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[60]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-4 rounded-xl shadow-xl text-white font-medium min-w-80 transform transition-all duration-300 flex items-center justify-between ${
              toast.type === "success" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-4 text-white hover:opacity-80 transition-opacity p-1"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}