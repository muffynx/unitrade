// src/pages/admin/AdminMessages.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { FaTrashAlt, FaEye, FaSyncAlt } from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Clock,
  MessageCircle,
  User as UserIcon,
  AlertCircle,
  X,
  MapPin,
  Tag,
  Search,
  Calendar,
  XCircle,
} from "lucide-react";

// ✅ เพิ่ม User Interface ให้สมบูรณ์ แม้ว่าจะไม่ได้ใช้ Avatar ในหน้านี้ก็ตาม
interface User {
  name: string;
  email: string;
  _id: string;
  avatar?: string;
  profileImage?: string;
}

interface MessageAdmin {
  _id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  location: string;
  user: User; // ใช้ User Interface ที่เพิ่งสร้าง
  createdAt: string;
  views: number;
  comments: any[];
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

type UrgencyFilter = "all" | "high" | "medium" | "low";
type CategoryFilter = "all" | string;

const getUrgencyLabel = (urgency: string) => {
  switch (urgency) {
    case "high":
      return { label: "ด่วนมาก", color: "bg-red-100 border-red-300 text-red-800" };
    case "medium":
      return { label: "ปานกลาง", color: "bg-yellow-100 border-yellow-300 text-yellow-800" };
    case "low":
      return { label: "ไม่รีบ", color: "bg-green-100 border-green-300 text-green-800" };
    default:
      return { label: "ไม่ระบุ", color: "bg-gray-100 border-gray-300 text-gray-800" };
  }
};

export default function AdminMessages() {
  const [activePage, setActivePage] = useState<"dashboard" | "users" | "messages">("messages");
  const [messages, setMessages] = useState<MessageAdmin[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<MessageAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageAdmin | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const token = localStorage.getItem("adminToken");

  // Toast Notification
  const showToast = (toastMessage: string, type: "success" | "error") => {
    const id = new Date().getTime().toString();
    const toast: Toast = { id, message: toastMessage, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // โหลดข้อความจาก API
  const fetchMessages = async () => {
    if (!token) {
      setError("ไม่พบ Admin Token");
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/api/admin/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError("ไม่สามารถโหลดรายการข้อความได้");
      showToast("ไม่สามารถโหลดรายการข้อความได้", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter messages
  useEffect(() => {
    filterMessages();
  }, [messages, searchQuery, urgencyFilter, categoryFilter]);

  const filterMessages = () => {
    let filtered = [...messages];

    // Filter by urgency
    if (urgencyFilter !== "all") {
      filtered = filtered.filter((m) => m.urgency === urgencyFilter);
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((m) => m.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.user.name.toLowerCase().includes(query) ||
          m.user.email.toLowerCase().includes(query) ||
          m.location.toLowerCase().includes(query)
      );
    }

    setFilteredMessages(filtered);
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
  const sendAdminMessage = async (conversationId: string, content: string) => {
    if (!conversationId) return false;
    try {
      await axios.post(
        `${API_URL}/api/conversations/${conversationId}/admin-messages`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (err: any) {
      console.error("Cannot send admin message", err.response?.data || err);
      return false;
    }
  };

  // ลบข้อความ + แจ้งผู้ใช้
  const handleDelete = async (messageId: string, ownerId: string, messageTitle: string) => {
    if (
      !confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบข้อความ "${messageTitle}"?\n\nผู้ใช้จะได้รับการแจ้งเตือนผ่านระบบแชท`
      )
    )
      return;

    setDeletingMessageId(messageId);

    try {
      // ลบข้อความ
      await axios.delete(`${API_URL}/api/admin/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let notificationSent = false;

      // สร้างหรือดึง conversation และส่งข้อความแจ้งผู้ใช้
      if (ownerId) {
        const conversation = await createOrGetAdminChat(ownerId);

        if (conversation?._id) {
          notificationSent = await sendAdminMessage(
            conversation._id,
            `ข้อความ (Post) ของคุณถูกลบ\n\n` +
              `หัวข้อ: ${messageTitle}\n` +
              `เหตุผล: เนื้อหาไม่เป็นไปตามนโยบายของแพลตฟอร์ม\n\n` +
              `หากคุณคิดว่ามีข้อผิดพลาดหรือต้องการทราบรายละเอียดเพิ่มเติม กรุณาติดต่อทีมสนับสนุน\n\n` +
              `ขอขอบคุณที่ใช้บริการของเรา`
          );
        }
      }

      // อัปเดต state
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      setShowDetailModal(false);

      if (notificationSent) {
        showToast(`ลบข้อความ "${messageTitle}" สำเร็จและแจ้งผู้ใช้แล้ว`, "success");
      } else {
        showToast(`ลบข้อความ "${messageTitle}" สำเร็จ`, "success");
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      const errorMessage = err.response?.data?.message || "ลบข้อความไม่สำเร็จ";
      showToast(errorMessage, "error");
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchMessages();
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Get unique categories
  const categories = Array.from(new Set(messages.map((m) => m.category)));

  const stats = {
    total: messages.length,
    high: messages.filter((m) => m.urgency === "high").length,
    medium: messages.filter((m) => m.urgency === "medium").length,
    low: messages.filter((m) => m.urgency === "low").length,
    totalViews: messages.reduce((sum, msg) => sum + msg.views, 0),
    totalComments: messages.reduce((sum, msg) => sum + (msg.comments?.length || 0), 0),
  };

  return (
    <AdminLayout activePage={activePage} setActivePage={setActivePage}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">จัดการข้อความ (Posts)</h1>
            <p className="text-gray-500 mt-1">ตรวจสอบและจัดการข้อความจากผู้ใช้งาน</p>
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
        {/* ✅ grid-cols-2 lg:grid-cols-4 responsiveness นี้ดีอยู่แล้วสำหรับมือถือและแท็บเล็ต */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ข้อความทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ด่วนมาก</p>
                <p className="text-2xl font-bold text-red-600">{stats.high}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
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
                <p className="text-sm text-gray-500">ความคิดเห็นรวม</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalComments.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        {/* ✅ flex-col md:flex-row responsiveness นี้ดีอยู่แล้วสำหรับมือถือและแท็บเล็ต */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาตามหัวข้อ, รายละเอียด, ชื่อผู้ใช้..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as UrgencyFilter)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ความเร่งด่วนทั้งหมด</option>
              <option value="high">ด่วนมาก</option>
              <option value="medium">ปานกลาง</option>
              <option value="low">ไม่รีบ</option>
            </select>

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
          </div>
        </div>

        {/* ✅ Messages Table / Card List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
            <>
              {/* ✅ 1. Table View (ซ่อนในจอมือถือ, แสดงในจอ md ขึ้นไป) */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        หัวข้อ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ผู้โพสต์
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        หมวดหมู่
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ความเร่งด่วน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถิติ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่โพสต์
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        การดำเนินการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMessages.map((msg) => {
                      const urgency = getUrgencyLabel(msg.urgency);
                      return (
                        <tr key={msg._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <div className="font-medium text-gray-900 line-clamp-2">
                                {msg.title}
                              </div>
                              <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                {msg.description}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {/* ใช้ UserIcon Placeholder */}
                              <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <UserIcon className="h-5 w-5 text-gray-500" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 line-clamp-1">
                                  {msg.user?.name || "ไม่ระบุชื่อ"}
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-1">
                                  {msg.user?.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                              <Tag size={14} />
                              {msg.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${urgency.color}`}
                            >
                              {urgency.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <FaEye size={12} />
                                <span className="font-medium">{msg.views.toLocaleString()} วิว</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle size={12} />
                                <span className="font-medium">{msg.comments?.length || 0} คอมเมนต์</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(msg.createdAt).toLocaleDateString("th-TH", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                              <Clock className="h-3 w-3" />
                              {new Date(msg.createdAt).toLocaleTimeString("th-TH", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedMessage(msg);
                                setShowDetailModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                            >
                              <FaEye className="h-3 w-3" />
                              ดู
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMessages.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <MessageCircle className="h-12 w-12 text-gray-400 mb-3" />
                            <p className="text-gray-500 text-lg font-medium">ไม่พบข้อความ</p>
                            <p className="text-gray-400 text-sm mt-1">
                              ลองเปลี่ยนตัวกรองหรือคำค้นหา
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ✅ 2. Card List View (แสดงในจอมือถือ, ซ่อนในจอ md ขึ้นไป) */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredMessages.map((msg) => {
                  const urgency = getUrgencyLabel(msg.urgency);
                  return (
                    <div key={msg._id} className="p-4">
                      {/* Top: Title & Urgency */}
                      <div className="flex justify-between items-start gap-3">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">
                          {msg.title}
                        </h3>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${urgency.color} flex-shrink-0`}
                        >
                          {urgency.label}
                        </span>
                      </div>

                      {/* User Info */}
                      <div className="flex items-center gap-2 mt-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 text-sm line-clamp-1">
                            {msg.user?.name || "ไม่ระบุชื่อ"}
                          </div>
                          <div className="text-xs text-gray-500 line-clamp-1">
                            {msg.user?.email}
                          </div>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Tag size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">{msg.category}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            {new Date(msg.createdAt).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FaEye size={12} className="text-gray-400 flex-shrink-0" />
                          <span>{msg.views.toLocaleString()} วิว</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle size={12} className="text-gray-400 flex-shrink-0" />
                          <span>{msg.comments?.length || 0} คอมเมนต์</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            setSelectedMessage(msg);
                            setShowDetailModal(true);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                        >
                          <FaEye className="h-4 w-4" />
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* No messages view for mobile */}
                {filteredMessages.length === 0 && (
                  <div className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <MessageCircle className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-500 text-lg font-medium">ไม่พบข้อความ</p>
                      <p className="text-gray-400 text-sm mt-1">
                        ลองเปลี่ยนตัวกรองหรือคำค้นหา
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
              <h3 className="text-xl font-semibold text-gray-900">รายละเอียดข้อความ</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 p-2 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="ปิด"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-6">
              {/* Message Info */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-gray-500">หัวข้อ</label>
                  <h2 className="mt-2 text-2xl font-bold text-gray-900">{selectedMessage.title}</h2>
                </div>

                {/* User Info */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">ผู้โพสต์</label>
                  <div className="mt-2 flex items-center gap-3">
                    {/* Used UserIcon Placeholder */}
                    <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">
                        {selectedMessage.user?.name || "ไม่ระบุชื่อ"}
                      </p>
                      <p className="text-sm text-gray-600">{selectedMessage.user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {/* ✅ grid-cols-2 lg:grid-cols-3 นี้ดีอยู่แล้วสำหรับมือถือ */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">หมวดหมู่</label>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border bg-blue-100 text-blue-800 border-blue-200">
                        <Tag size={14} />
                        {selectedMessage.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">ความเร่งด่วน</label>
                    <div className="mt-2">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${
                          getUrgencyLabel(selectedMessage.urgency).color
                        }`}
                      >
                        {getUrgencyLabel(selectedMessage.urgency).label}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">สถานที่</label>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border bg-gray-100 text-gray-800 border-gray-200">
                        <MapPin size={14} />
                        {selectedMessage.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-500">รายละเอียด</label>
                  <p className="mt-2 text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner">
                    {selectedMessage.description}
                  </p>
                </div>

                {/* Stats */}
                <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                  <label className="text-sm font-medium text-gray-700 mb-3 block">สถิติ</label>
                  {/* ✅ ปรับจาก grid-cols-3 เป็น grid-cols-1 sm:grid-cols-3 เพื่อให้แสดงผลดีขึ้นในมือถือ */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white rounded-lg">
                        <FaEye className="text-gray-600" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ยอดวิว</p>
                        <p className="text-lg font-bold text-gray-900">{selectedMessage.views.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white rounded-lg">
                        <MessageCircle className="text-gray-600" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ความคิดเห็น</p>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedMessage.comments?.length.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white rounded-lg">
                        <Calendar className="text-gray-600" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">วันที่โพสต์</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(selectedMessage.createdAt).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Created At (Detailed) */}
                <div>
                  <label className="text-sm font-medium text-gray-500">วันที่และเวลาโพสต์</label>
                  <p className="mt-2 text-gray-700 text-sm">
                    {new Date(selectedMessage.createdAt).toLocaleString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Delete Action */}
              <div className="border-t pt-6">
                <label className="text-sm font-medium text-gray-700 mb-3 block">การดำเนินการสำหรับผู้ดูแลระบบ</label>
                <button
                  onClick={() =>
                    handleDelete(selectedMessage._id, selectedMessage.user?._id || "", selectedMessage.title)
                  }
                  disabled={deletingMessageId === selectedMessage._id}
                  className={`w-full font-medium py-3 rounded-xl flex justify-center items-center gap-2 transition-all duration-200 shadow-lg ${
                    deletingMessageId === selectedMessage._id
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {deletingMessageId === selectedMessage._id ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      กำลังลบข้อความและแจ้งผู้ใช้...
                    </>
                  ) : (
                    <>
                      <FaTrashAlt size={16} />
                      ลบข้อความและแจ้งเตือนผู้ใช้ (ขั้นเด็ดขาด)
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