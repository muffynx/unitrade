// src/pages/admin/AdminProducts.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaTrashAlt,
  FaEye,
  FaSyncAlt,
  FaExternalLinkAlt,
} from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Package,
  AlertCircle,
  X,
  DollarSign,
  CheckCircle,
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
  sold: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

type CategoryFilter = "all" | string;
type ConditionFilter = "all" | "new" | "like-new" | "good" | "fair";

// Helper function to get avatar URL
const getAvatarUrl = (user: {
  name: string;
  avatar?: string;
  profileImage?: string;
}) => {
  if (user.profileImage) return user.profileImage;
  if (user.avatar) return user.avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user.name
  )}&background=random&size=128`;
};

export default function AdminProducts() {
  const [activePage, setActivePage] = useState<
    "dashboard" | "users" | "products"
  >("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [conditionFilter, setConditionFilter] =
    useState<ConditionFilter>("all");

  const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
  const token = localStorage.getItem("adminToken");

  const handleUserImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
    name: string
  ) => {
    if (e.currentTarget.src.includes("ui-avatars.com")) return;
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&size=128`;
  };

  const showToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000
    );
  };

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

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, categoryFilter, conditionFilter]);

  const filterProducts = () => {
    let filtered = [...products];

    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    if (conditionFilter !== "all") {
      filtered = filtered.filter((p) => p.condition === conditionFilter);
    }

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

  const handleDelete = async (
    productId: string,
    ownerId: string,
    productTitle: string
  ) => {
    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${productTitle}"?\n\nผู้ใช้จะได้รับการแจ้งเตือนผ่านระบบแชท`
      )
    )
      return;

    setDeletingProductId(productId);

    try {
      await axios.delete(`${API_URL}/api/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let notificationSent = false;

      if (ownerId) {
        const conversation = await createOrGetAdminChat(ownerId);
        if (conversation?._id) {
          notificationSent = await sendAdminMessage(
            conversation._id,
            `สินค้าของคุณถูกลบ\n\nสินค้า: ${productTitle}\nเหตุผล: เนื้อหาไม่เป็นไปตามนโยบายของแพลตฟอร์ม\n\nหากคุณคิดว่ามีข้อผิดพลาดหรือต้องการทราบรายละเอียดเพิ่มเติม กรุณาติดต่อทีมสนับสนุนของเรา\n\nขอขอบคุณที่ใช้บริการของเรา`
          );
        }
      }

      setProducts((prev) => prev.filter((p) => p._id !== productId));
      setShowDetailModal(false);

      if (notificationSent) {
        showToast(
          `ลบสินค้า "${productTitle}" สำเร็จและแจ้งผู้ใช้แล้ว`,
          "success"
        );
      } else {
        showToast(`ลบสินค้า "${productTitle}" สำเร็จ`, "success");
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      showToast(err.response?.data?.message || "ลบสินค้าไม่สำเร็จ", "error");
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

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      new: "ใหม่",
      used_like_new: "เหมือนใหม่",
      used_good: "ดี",
      used_fair: "พอใช้",
    };
    return labels[condition] || condition;
  };

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      new: "bg-green-100 text-green-800 border-green-200",
      used_like_new: "bg-blue-100 text-blue-800 border-blue-200",
      used_good: "bg-yellow-100 text-yellow-800 border-yellow-200",
      used_fair: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colors[condition] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const stats = {
    total: products.length,
    totalValue: products.reduce((sum, p) => sum + p.price, 0),
    totalViews: products.reduce((sum, p) => sum + p.views, 0),
  };

  return (
    <AdminLayout activePage={activePage} setActivePage={setActivePage}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">จัดการสินค้า</h1>
            <p className="text-gray-500 mt-1">
              ตรวจสอบและจัดการสินค้าจากผู้ใช้งาน
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm border border-gray-200 hover:shadow-md disabled:opacity-50 text-sm"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} size={16} />
            {loading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "สินค้าทั้งหมด",
              value: stats.total,
              icon: Package,
              color: "blue",
            },
            {
              label: "มูลค่ารวม",
              value: `฿${stats.totalValue.toLocaleString()}`,
              icon: DollarSign,
              color: "green",
            },
            {
              label: "ยอดวิวรวม",
              value: stats.totalViews.toLocaleString(),
              icon: FaEye,
              color: "purple",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p
                    className={`text-2xl font-bold text-${stat.color}-600 mt-1`}
                  >
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-3">
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

            <select
              value={conditionFilter}
              onChange={(e) =>
                setConditionFilter(e.target.value as ConditionFilter)
              }
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">สภาพทั้งหมด</option>
              <option value="new">ใหม่</option>
              <option value="like-new">เหมือนใหม่</option>
              <option value="used_good">ดี</option>
              <option value="used_fair">พอใช้</option>
            </select>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-50 border border-red-200 p-6 rounded-xl flex items-center gap-3">
              <AlertCircle size={24} />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-sm text-red-500 mt-1">
                  กรุณาลองใหม่อีกครั้ง
                </p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mb-3 mx-auto" />
              <p className="text-gray-500 text-lg font-medium">ไม่พบสินค้า</p>
              <p className="text-gray-400 text-sm mt-1">
                ลองเปลี่ยนตัวกรองหรือคำค้นหา
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product._id}
                className="bg-white border rounded-xl p-4 relative"
              >
                {product.sold && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-full shadow-lg">
                      <CheckCircle className="h-3 w-3" />
                      ขายแล้ว
                    </span>
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={
                        product.images?.[0] || "https://via.placeholder.com/200"
                      }
                      alt={product.title}
                      className={`object-cover w-full h-full ${
                        product.sold ? "opacity-60" : ""
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-bold text-base line-clamp-2 mb-1 ${
                        product.sold ? "text-gray-500" : "text-gray-900"
                      }`}
                    >
                      {product.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                      {product.description}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Tag size={12} className="text-gray-400" />
                        {product.category}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${getConditionColor(
                          product.condition
                        )}`}
                      >
                        {getConditionLabel(product.condition)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div
                        className={`text-lg font-bold ${
                          product.sold
                            ? "text-gray-400 line-through"
                            : "text-green-600"
                        }`}
                      >
                        ฿{product.price.toLocaleString()}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowDetailModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                      >
                        <FaEye className="h-3.5 w-3.5" />
                        ดูรายละเอียด
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FaEye size={12} />
                        {product.views} วิว
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-50 border border-red-200 p-6 rounded-xl m-6 flex items-center gap-3">
              <AlertCircle size={24} />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-sm text-red-500 mt-1">
                  กรุณาลองใหม่อีกครั้ง
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สินค้า
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้ขาย
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หมวดหมู่
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สภาพ
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ราคา
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ยอดวิว
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Product Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img
                              src={
                                product.images?.[0] ||
                                "https://via.placeholder.com/200"
                              }
                              alt={product.title}
                              className={`object-cover w-full h-full ${
                                product.sold ? "opacity-60" : ""
                              }`}
                            />
                          </div>
                          <div
                            className="min-w-0"
                            style={{ maxWidth: "200px" }}
                          >
                            <div
                              className={`font-medium text-sm truncate ${
                                product.sold ? "text-gray-500" : "text-gray-900"
                              }`}
                            >
                              {product.title}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Seller Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={getAvatarUrl(product.user)}
                            alt={product.user.name}
                            className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                            onError={(e) =>
                              handleUserImageError(e, product.user.name)
                            }
                          />
                          <div
                            className="min-w-0"
                            style={{ maxWidth: "120px" }}
                          >
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {product.user?.name || "ไม่ระบุชื่อ"}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {product.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                          <Package size={10} />
                          <span className="max-w-[80px] truncate">
                            {product.category}
                          </span>
                        </span>
                      </td>

                      {/* Condition */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getConditionColor(
                            product.condition
                          )}`}
                        >
                          {getConditionLabel(product.condition)}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-3 py-3">
                        <div
                          className={`font-bold text-sm whitespace-nowrap ${
                            product.sold
                              ? "text-gray-400 line-through"
                              : "text-gray-900"
                          }`}
                        >
                          ฿{product.price.toLocaleString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        {product.sold ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                            <CheckCircle size={10} />
                            ขายแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
                            <Package size={10} />
                            พร้อมขาย
                          </span>
                        )}
                      </td>

                      {/* Views */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 text-gray-600 whitespace-nowrap">
                          <FaEye
                            size={12}
                            className="text-purple-500 flex-shrink-0"
                          />
                          <span className="font-medium text-sm">
                            {product.views.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3">
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {new Date(product.createdAt).toLocaleDateString(
                                "th-TH",
                                {
                                  day: "numeric",
                                  month: "short",
                                }
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {new Date(product.createdAt).toLocaleTimeString(
                                "th-TH",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDetailModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                        >
                          <FaEye className="h-3 w-3" />
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center">
                        <Package className="h-16 w-16 text-gray-300 mb-4 mx-auto" />
                        <p className="text-gray-500 text-lg font-medium">
                          ไม่พบสินค้า
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          ลองเปลี่ยนตัวกรองหรือคำค้นหา
                        </p>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900">
                  รายละเอียดสินค้า
                </h3>
                {selectedProduct.sold && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-full">
                    <CheckCircle size={14} />
                    ขายแล้ว
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Product Images */}
              {selectedProduct.images?.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">
                    รูปภาพสินค้า ({selectedProduct.images.length} รูป)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedProduct.images.map((image, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm relative group"
                      >
                        <img
                          src={image || "https://via.placeholder.com/300"}
                          alt={`${selectedProduct.title} - ${index + 1}`}
                          className={`object-cover w-full h-full transition-transform group-hover:scale-110 ${
                            selectedProduct.sold ? "opacity-60" : ""
                          }`}
                        />
                        {selectedProduct.sold && index === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <span className="text-white font-bold text-xl">
                              ขายแล้ว
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Details Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Title & Price */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                    <label className="text-sm font-medium text-blue-900 mb-2 block">
                      ชื่อสินค้า
                    </label>
                    <h2 className="text-xl font-bold text-gray-900 mb-3 break-words">
                      {selectedProduct.title}
                    </h2>
                    <p
                      className={`text-3xl font-bold ${
                        selectedProduct.sold
                          ? "text-gray-400 line-through"
                          : "text-green-600"
                      }`}
                    >
                      ฿{selectedProduct.price.toLocaleString()}
                    </p>
                  </div>

                  {/* Description */}
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      รายละเอียด
                    </label>
                    <p className="text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed text-sm">
                      {selectedProduct.description}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      สถานที่
                    </label>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-300 shadow-sm">
                      <MapPin size={14} />
                      {selectedProduct.location}
                    </span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Seller Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-200">
                    <label className="text-sm font-semibold text-blue-900 mb-3 block">
                      ผู้ขาย
                    </label>
                    <div className="flex items-center gap-4">
                      <img
                        src={getAvatarUrl(selectedProduct.user)}
                        alt={selectedProduct.user.name}
                        className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-lg"
                        onError={(e) =>
                          handleUserImageError(e, selectedProduct.user.name)
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-lg truncate">
                          {selectedProduct.user?.name || "ไม่ระบุชื่อ"}
                        </p>
                        <p className="text-sm text-blue-700 truncate">
                          {selectedProduct.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <label className="text-xs font-semibold text-gray-600 block mb-2">
                        หมวดหมู่
                      </label>
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Tag size={12} />
                        {selectedProduct.category}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <label className="text-xs font-semibold text-gray-600 block mb-2">
                        สภาพ
                      </label>
                      <span
                        className={`inline-flex px-3 py-1.5 rounded-full text-xs font-medium ${getConditionColor(
                          selectedProduct.condition
                        )}`}
                      >
                        {getConditionLabel(selectedProduct.condition)}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200">
                    <label className="text-sm font-semibold text-purple-900 mb-3 block">
                      สถิติ
                    </label>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FaEye size={20} className="text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">ยอดวิว</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {selectedProduct.views.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date/Time */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      วันที่ลงขาย
                    </label>
                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                      <Calendar size={16} className="text-gray-500" />
                      <span>
                        {new Date(selectedProduct.createdAt).toLocaleString(
                          "th-TH",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() =>
                    window.open(`/product/${selectedProduct._id}`, "_blank")
                  }
                  className="flex-1 font-semibold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                  <FaExternalLinkAlt size={16} />
                  ดูสินค้าในหน้าร้าน
                </button>

                <button
                  onClick={() =>
                    handleDelete(
                      selectedProduct._id,
                      selectedProduct.user?._id || "",
                      selectedProduct.title
                    )
                  }
                  disabled={deletingProductId === selectedProduct._id}
                  className={`flex-1 font-semibold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg ${
                    deletingProductId === selectedProduct._id
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  }`}
                >
                  {deletingProductId === selectedProduct._id ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      กำลังลบ...
                    </>
                  ) : (
                    <>
                      <FaTrashAlt size={16} />
                      ลบสินค้าและแจ้งเตือน
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[60]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-4 rounded-xl shadow-2xl text-white font-medium min-w-80 transform transition-all duration-300 flex items-center justify-between ${
              toast.type === "success"
                ? "bg-gradient-to-r from-green-600 to-green-700"
                : "bg-gradient-to-r from-red-600 to-red-700"
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}