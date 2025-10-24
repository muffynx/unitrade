import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  FaSignOutAlt,
  FaUserShield,
  FaChartLine, // เปลี่ยนจาก FaChartPie เพื่อให้ดูทันสมัยขึ้น
  FaUsers,
  FaFileAlt,
  FaEnvelope,
  FaShoppingCart,
  FaBars, // สำหรับปุ่มเมนูมือถือ
  FaTimes, // สำหรับปุ่มปิดเมนู
  FaBell, // เพิ่ม Notification Center สำหรับ Admin
} from "react-icons/fa";

interface AdminLayoutProps {
  children: ReactNode;
}

// โครงสร้าง Navigation ที่ถูกจัดระเบียบใหม่
const adminNavigation = [
  { path: "/admin", icon: FaChartLine, label: "Dashboard" },
  { path: "/admin/users", icon: FaUsers, label: "Users Management" },
  {
    path: "/admin/products",
    icon: FaShoppingCart,
    label: "Products Management",
  },
  {
    path: "/admin/MessagesAdmin",
    icon: FaEnvelope,
    label: "Messages Management",
  },
  { path: "/admin/messages", icon: FaEnvelope, label: "Chat Messages" },
  { path: "/admin/reports", icon: FaFileAlt, label: "Reports Center" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State สำหรับเปิด/ปิด Sidebar บนมือถือ

  const handleLogout = () => {
    // ลบ token ทั้งหมด หรือเฉพาะ adminToken
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    navigate("/login");
  };

  const getActive = (path: string) =>
    location.pathname === path
      ? "bg-blue-100 text-blue-600 font-semibold"
      : "text-gray-700 hover:bg-gray-50";

  // ฟังก์ชันหาชื่อหน้าปัจจุบัน
  const getPageTitle = (pathname: string): string => {
    const activeItem = adminNavigation.find((item) => item.path === pathname);

    if (activeItem) {
      return activeItem.label;
    }

    // Fallback สำหรับหน้าย่อย หรือหน้าหลัก
    if (pathname.startsWith("/admin/users/")) return "User Details";
    if (pathname.startsWith("/admin/products/")) return "Product Details";

    return "Admin Panel";
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 1. Mobile Overlay & Sidebar Toggle */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 2. Sidebar (Fixed on Desktop, Toggleable on Mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-30 
        transition-transform duration-300 md:translate-x-0 
        ${isSidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}`}
      >
        <div className="p-6 text-2xl font-bold text-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaUserShield className="text-blue-600" />
            Admin Panel
          </div>
          <button
            className="md:hidden p-1 text-gray-500 hover:text-gray-700"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {adminNavigation.map((item) => (
            <button
              key={item.path}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 transition ${getActive(
                item.path
              )}`}
              onClick={() => {
                navigate(item.path);
                setIsSidebarOpen(false);
              }}
            >
              <item.icon /> {item.label}
            </button>
          ))}
        </nav>

        <button
          className="flex items-center gap-2 px-6 py-3 mt-auto mb-6 text-red-600 hover:text-red-800 hover:bg-red-50 transition rounded mx-4"
          onClick={handleLogout}
        >
          <FaSignOutAlt /> Logout
        </button>
      </aside>

      <div className="flex-1 flex flex-col md:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <button
            className="md:hidden p-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-lg"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars className="h-5 w-5" />
          </button>

          <h1 className="text-lg font-semibold text-gray-700 flex-1 truncate">
            {getPageTitle(location.pathname)}
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">
              Admin Logged In
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
              A
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
