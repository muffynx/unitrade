import { useState, useEffect } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import axios from "axios";
import {
  Search,
  User as UserIcon,
  Package,
  AlertTriangle,
  Trash2,
  Eye,
  X,
  Mail,
  Shield,
  Users as UsersIcon,
  ShoppingBag,
  Calendar,
  DollarSign,
  MapPin,
  Tag,
  TrendingUp,
  Bell,
  Send,
  MessageSquare,
  CheckCircle,
} from "lucide-react";

interface Product {
  _id: string;
  title: string;
  price: number;
  category?: string;
  description?: string;
  condition?: string;
  location?: string;
  images?: string[];
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  studentId: string;
  role?: string;
  status?: string;
  avatar?: string;
  createdAt?: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning";
}

interface NotificationTemplate {
  id: string;
  title: string;
  message: string;
  type: "warning" | "info" | "success" | "error";
}

export default function Users() {
  const [activePage, setActivePage] = useState<
    "dashboard" | "users" | "products"
  >("users");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Notification states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "warning" | "info" | "success" | "error"
  >("info");
  const [sendingNotification, setSendingNotification] = useState(false);

  const token =
    localStorage.getItem("adminToken") || localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL || "https://unitrade2.onrender.com";

  // Toast Notification
  const showToast = (
    message: string,
    type: "success" | "error" | "warning"
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Fetch Users
  const fetchUsers = async () => {
    if (!token) {
      showToast("ไม่พบ Token", "error");
      setLoadingUsers(false);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data || []);
    } catch (err: any) {
      console.error("fetchUsers error:", err);
      showToast(
        err?.response?.data?.message || "ไม่สามารถโหลดรายการผู้ใช้ได้",
        "error"
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  // Filter Users
  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const filterUsers = () => {
    let filtered = [...users];

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => (u.role || "user") === roleFilter);
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (u) => (u.status || "active") === statusFilter
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.studentId.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  // Fetch User Products
  const fetchUserProducts = async (userId: string) => {
    if (!token) return;
    setLoadingProducts(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { userId },
      });
      if (Array.isArray(res.data)) setUserProducts(res.data);
      else setUserProducts([]);
    } catch (err: any) {
      console.error("fetchUserProducts error:", err);
      showToast(
        err?.response?.data?.message || "ไม่สามารถโหลดสินค้าได้",
        "error"
      );
      setUserProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Delete User
  const deleteUser = async (id: string, userName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${userName}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((s) => s.filter((u) => u._id !== id));
      showToast(`ลบผู้ใช้ "${userName}" สำเร็จ`, "success");
    } catch (err: any) {
      console.error("deleteUser error:", err);
      showToast(
        err?.response?.data?.message || "ไม่สามารถลบผู้ใช้ได้",
        "error"
      );
    }
  };

  // Delete Product
  const deleteProduct = async (productId: string, productTitle: string) => {
    if (!confirm(`ลบสินค้า "${productTitle}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserProducts((s) => s.filter((p) => p._id !== productId));
      showToast(`ลบสินค้า "${productTitle}" สำเร็จ`, "success");
    } catch (err: any) {
      console.error("deleteProduct error:", err);
      showToast(
        err?.response?.data?.message || "ไม่สามารถลบสินค้าได้",
        "error"
      );
    }
  };

  // Notification Templates
  const notificationTemplates: NotificationTemplate[] = [
    {
      id: "inappropriate_content",
      title: "แจ้งเตือนเกี่ยวกับเนื้อหาไม่เหมาะสม",
      message:
        "เราได้รับรายงานเกี่ยวกับเนื้อหาที่คุณโพสต์ว่าอาจไม่เหมาะสม กรุณาตรวจสอบและปรับปรุงเนื้อหาให้เป็นไปตามข้อกำหนดของชุมชน",
      type: "warning",
    },
    {
      id: "spam_behavior",
      title: "แจ้งเตือนเกี่ยวกับพฤติกรรมสแปม",
      message:
        "เราได้รับรายงานเกี่ยวกับพฤติกรรมที่อาจเป็นการสแปม กรุณาใช้แพลตฟอร์มอย่างเหมาะสมและไม่ส่งข้อความซ้ำๆ",
      type: "warning",
    },
    {
      id: "account_suspension",
      title: "แจ้งเตือนการระงับบัญชีชั่วคราว",
      message:
        "บัญชีของคุณถูกระงับชั่วคราวเนื่องจากละเมิดข้อกำหนด กรุณาติดต่อทีมสนับสนุนหากต้องการทราบรายละเอียดเพิ่มเติม",
      type: "error",
    },
    {
      id: "system_maintenance",
      title: "แจ้งเตือนการบำรุงรักษาระบบ",
      message:
        "ระบบจะมีการบำรุงรักษาในวันที่ [วันที่] เวลา [เวลา] กรุณาเตรียมตัวล่วงหน้า",
      type: "info",
    },
    {
      id: "welcome_message",
      title: "ยินดีต้อนรับสู่ UniTrade",
      message:
        "ยินดีต้อนรับสู่ UniTrade! ขอให้คุณมีประสบการณ์การซื้อขายที่ดีกับเรา หากมีคำถามสามารถติดต่อทีมสนับสนุนได้ตลอดเวลา",
      type: "success",
    },
  ];

  // Send Notification
  const sendNotification = async () => {
    if (
      !notificationTitle.trim() ||
      !notificationMessage.trim() ||
      selectedUsers.length === 0
    ) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "warning");
      return;
    }

    setSendingNotification(true);
    try {
      const notificationData = {
        userIds: selectedUsers.map((user) => user._id),
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        type: notificationType,
      };

      await axios.post(
        `${API_URL}/api/admin/notifications/send`,
        notificationData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(
        `ส่งการแจ้งเตือนให้ ${selectedUsers.length} คนสำเร็จ`,
        "success"
      );
      setShowNotificationModal(false);
      resetNotificationForm();
    } catch (err: any) {
      console.error("sendNotification error:", err);
      showToast(
        err?.response?.data?.message || "ไม่สามารถส่งการแจ้งเตือนได้",
        "error"
      );
    } finally {
      setSendingNotification(false);
    }
  };

  // Reset notification form
  const resetNotificationForm = () => {
    setSelectedUsers([]);
    setNotificationTitle("");
    setNotificationMessage("");
    setNotificationType("info");
  };

  // Handle user selection for notification
  const toggleUserSelection = (user: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u._id === user._id);
      if (isSelected) {
        return prev.filter((u) => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Use template
  const useTemplate = (template: NotificationTemplate) => {
    setNotificationTitle(template.title);
    setNotificationMessage(template.message);
    setNotificationType(template.type);
  };

  // Report User
  const reportUser = async (userId: string, userName: string) => {
    if (
      !confirm(`แจ้งเตือนผู้ใช้ "${userName}" เกี่ยวกับเนื้อหาที่ไม่เหมาะสม?`)
    )
      return;
    try {
      await axios.post(
        `${API_URL}/api/admin/users/${userId}/report`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`แจ้งเตือนผู้ใช้ "${userName}" สำเร็จ`, "success");
    } catch (err: any) {
      console.error("reportUser error:", err);
      showToast(
        err?.response?.data?.message || "ไม่สามารถแจ้งเตือนได้",
        "error"
      );
    }
  };

  // Handle View Products
  const handleViewProducts = async (user: User) => {
    setSelectedUser(user);
    await fetchUserProducts(user._id);
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Calculate Stats
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    active: users.filter((u) => (u.status || "active") === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getConditionLabel = (condition?: string) => {
    switch (condition) {
      case "new":
        return "ใหม่";
      case "like-new":
        return "เหมือนใหม่";
      case "good":
        return "ดี";
      case "fair":
        return "พอใช้";
      default:
        return condition || "-";
    }
  };

  return (
    <AdminLayout activePage={activePage} setActivePage={setActivePage}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              จัดการผู้ใช้งาน
            </h1>
            <p className="text-gray-500 mt-1">
              ตรวจสอบและจัดการข้อมูลผู้ใช้งานในระบบ
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNotificationModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Bell className="h-5 w-5" />
              ส่งการแจ้งเตือน
            </button>
            <button
              onClick={() => {
                setLoadingUsers(true);
                fetchUsers();
              }}
              disabled={loadingUsers}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-xl transition-all duration-200 shadow-sm border border-gray-200 hover:shadow-md disabled:opacity-50"
            >
              <TrendingUp
                className={`h-5 w-5 ${loadingUsers ? "animate-spin" : ""}`}
              />
              {loadingUsers ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">
                  ผู้ใช้ทั้งหมด
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">ผู้ดูแลระบบ</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">
                  {stats.admins}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">ใช้งานอยู่</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">ไม่ใช้งาน</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">
                  {stats.inactive}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 sm:p-4">
          <div className="flex flex-col md:flex-row gap-2 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อ, อีเมล, รหัสนักศึกษา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">บทบาททั้งหมด</option>
              <option value="user">ผู้ใช้งาน</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="active">ใช้งานอยู่</option>
              <option value="inactive">ไม่ใช้งาน</option>
            </select>
          </div>
        </div>

        {/* Users Table or Card List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loadingUsers ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Card list for mobile/tablet */}
              <div className="lg:hidden flex flex-col gap-2 p-2">
                {filteredUsers.length === 0 && (
                  <div className="py-8 text-center">
                    <UsersIcon className="h-10 w-10 text-gray-400 mb-3 mx-auto" />
                    <p className="text-gray-500 text-lg font-medium">
                      ไม่พบผู้ใช้งาน
                    </p>
                  </div>
                )}
                {filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    className="border rounded-lg py-3 px-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-base font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.studentId}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap mt-1">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs border ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {user.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs border ${getStatusColor(
                          user.status
                        )}`}
                      >
                        {(user.status || "active") === "active"
                          ? "ใช้งานอยู่"
                          : "ไม่ใช้งาน"}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleViewProducts(user)}
                        className="flex-1 flex items-center gap-1.5 px-2 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                        ดูสินค้า
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUsers([user]);
                          setShowNotificationModal(true);
                        }}
                        className="flex-1 flex items-center gap-1.5 px-2 py-2 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        <Bell className="h-4 w-4" />
                        แจ้งเตือน
                      </button>
                      <button
                        onClick={() => deleteUser(user._id, user.name)}
                        className="flex-1 flex items-center gap-1.5 px-2 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table for desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ผู้ใช้งาน
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        รหัสนักศึกษา
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        บทบาท
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        การดำเนินการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                                {user.name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.studentId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(
                              user.role
                            )}`}
                          >
                            {user.role === "admin"
                              ? "ผู้ดูแลระบบ"
                              : "ผู้ใช้งาน"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              user.status
                            )}`}
                          >
                            {(user.status || "active") === "active"
                              ? "ใช้งานอยู่"
                              : "ไม่ใช้งาน"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewProducts(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              ดูสินค้า
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUsers([user]);
                                setShowNotificationModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
                            >
                              <Bell className="h-4 w-4" />
                              แจ้งเตือน
                            </button>
                            <button
                              onClick={() => deleteUser(user._id, user.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <UsersIcon className="h-12 w-12 text-gray-400 mb-3" />
                            <p className="text-gray-500 text-lg font-medium">
                              ไม่พบผู้ใช้งาน
                            </p>
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
            </>
          )}
        </div>
      </div>

      {/* Products Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-6xl max-h-[98vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedUser.avatar ? (
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                    {selectedUser.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                    สินค้าของ {selectedUser.name}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6">
              {loadingProducts ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : userProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {userProducts.map((product) => (
                    <div
                      key={product._id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Product Image */}
                      <div className="h-48 bg-gray-100 relative">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="h-12 w-12" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-2 py-1 rounded-lg text-sm font-medium">
                          ฿{product.price.toLocaleString()}
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-3 sm:p-4">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
                          {product.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-3">
                          {product.description || "-"}
                        </p>

                        <div className="flex items-center gap-2 mb-3">
                          {product.category && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                              <Tag size={12} />
                              {product.category}
                            </span>
                          )}
                          {product.condition && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                              {getConditionLabel(product.condition)}
                            </span>
                          )}
                        </div>

                        {product.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                            <MapPin size={12} />
                            {product.location}
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                          <Calendar size={12} />
                          {new Date(product.createdAt).toLocaleDateString(
                            "th-TH"
                          )}
                        </div>

                        <button
                          onClick={() =>
                            deleteProduct(product._id, product.title)
                          }
                          className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg transition-colors border border-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          ลบสินค้า
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">
                    ไม่มีสินค้า
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    ผู้ใช้รายนี้ยังไม่มีสินค้าที่ลงขาย
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-4xl max-h-[98vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                    ส่งการแจ้งเตือน
                  </h3>
                  <p className="text-sm text-gray-500">
                    เลือกผู้ใช้และสร้างข้อความแจ้งเตือน
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNotificationModal(false);
                  resetNotificationForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* User Selection */}
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  เลือกผู้รับการแจ้งเตือน
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 sm:max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 sm:p-4">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUsers.some(
                      (u) => u._id === user._id
                    );
                    return (
                      <div
                        key={user._id}
                        onClick={() => toggleUserSelection(user)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                              {user.name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user.email}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  เลือกแล้ว {selectedUsers.length} คน
                </p>
              </div>

              {/* Notification Templates */}
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  เทมเพลตการแจ้งเตือน
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {notificationTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => useTemplate(template)}
                      className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            template.type === "warning"
                              ? "bg-yellow-100 text-yellow-600"
                              : template.type === "error"
                              ? "bg-red-100 text-red-600"
                              : template.type === "success"
                              ? "bg-green-100 text-green-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {template.type === "warning" ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : template.type === "error" ? (
                            <X className="h-4 w-4" />
                          ) : template.type === "success" ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <MessageSquare className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 text-sm">
                            {template.title}
                          </h5>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {template.message}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทการแจ้งเตือน
                  </label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value as any)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">ข้อมูลทั่วไป</option>
                    <option value="warning">คำเตือน</option>
                    <option value="success">สำเร็จ</option>
                    <option value="error">ข้อผิดพลาด</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    หัวข้อ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="กรอกหัวข้อการแจ้งเตือน"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ข้อความ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="กรอกข้อความการแจ้งเตือน"
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Preview */}
              {notificationTitle && notificationMessage && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">
                    ตัวอย่างการแจ้งเตือน
                  </h5>
                  <div
                    className={`p-4 rounded-lg border-l-4 ${
                      notificationType === "warning"
                        ? "bg-yellow-50 border-yellow-400"
                        : notificationType === "error"
                        ? "bg-red-50 border-red-400"
                        : notificationType === "success"
                        ? "bg-green-50 border-green-400"
                        : "bg-blue-50 border-blue-400"
                    }`}
                  >
                    <h6 className="font-semibold text-gray-900 mb-2">
                      {notificationTitle}
                    </h6>
                    <p className="text-sm text-gray-700">
                      {notificationMessage}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                จะส่งการแจ้งเตือนให้ {selectedUsers.length} คน
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    resetNotificationForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={sendNotification}
                  disabled={
                    !notificationTitle.trim() ||
                    !notificationMessage.trim() ||
                    selectedUsers.length === 0 ||
                    sendingNotification
                  }
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingNotification ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      ส่งการแจ้งเตือน
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-3 right-3 w-full max-w-xs sm:max-w-md flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl shadow-xl text-white font-medium transform transition-all duration-300 flex items-center justify-between pointer-events-auto ${
              toast.type === "success"
                ? "bg-green-500 hover:bg-green-600"
                : toast.type === "warning"
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="ml-3 text-white hover:opacity-80 transition-opacity"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
