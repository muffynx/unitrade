import { useEffect, useState, ReactNode } from "react";
import axios from "axios";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Users,
  Flag,
  Package,
  DollarSign,
  AlertCircle,
  RefreshCw,
  UserPlus,
  FileText,
} from "lucide-react";

// --- ปรับปรุง Interfaces ---
interface User {
  _id: string;
  name: string;
  email: string;
  studentId: string;
  role?: string;
  createdAt: string; // เพิ่มฟิลด์นี้
}

interface Report {
  _id: string;
  reportedBy: User | string; // อาจเป็น ID หรือ object ที่ populate มา
  type: string;
  message: string;
  status: "open" | "in_progress" | "resolved"; // ทำให้ status ชัดเจน
  createdAt: string; // เพิ่มฟิลด์นี้
}

interface Product {
  _id: string;
  title: string;
  price: number;
  createdAt: string; // เพิ่มฟิลด์นี้
}

// --- Helper Component: Stat Card ---
interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  note?: string;
}

const StatCard = ({ title, value, icon, note }: StatCardProps) => (
  <div className="bg-white shadow-sm p-6 rounded-xl border border-gray-200 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {note && <p className="text-xs text-gray-400 mt-2">{note}</p>}
    </div>
    <div className="p-3 bg-gray-100 rounded-lg">{icon}</div>
  </div>
);

// --- Main Dashboard Component ---
export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem("adminToken");
  const API_URL =
    import.meta.env.VITE_API_URL || "https://unitrade5.onrender.com";

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    if (!token) {
      setError("ไม่พบ Admin Token");
      setLoading(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // ดึงข้อมูลทั้งหมดพร้อมกัน
      const [usersRes, reportsRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/users`, { headers }),
        axios.get(`${API_URL}/api/admin/reports`, { headers }),
        axios.get(`${API_URL}/api/admin/products`, { headers }),
      ]);

      setUsers(usersRes.data);
      setReports(reportsRes.data);
      setProducts(productsRes.data);
    } catch (err: any) {
      console.error(err);
      setError(
        "ไม่สามารถโหลดข้อมูล Dashboard ได้: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- คำนวณข้อมูลสถิติ ---
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // สถิติหลัก
  const totalUsers = users.length;
  const openReports = reports.filter((r) => r.status === "open").length;
  const totalProducts = products.length;
  const totalProductValue = products.reduce((sum, p) => sum + p.price, 0);

  // สถิติ 24 ชั่วโมง
  const newUsers24h = users.filter(
    (u) => new Date(u.createdAt) > oneDayAgo
  ).length;
  const newReports24h = reports.filter(
    (r) => new Date(r.createdAt) > oneDayAgo
  ).length;

  // รายการล่าสุด (สำหรับแสดงผล)
  const recentOpenReports = reports
    .filter((r) => r.status === "open")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const recentUsers = users
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const formatTimeAgo = (dateString: string) => {
    // (สามารถเพิ่ม logic การแสดงผลแบบ '... นาทีที่แล้ว' ที่นี่)
    //สำหรับตอนนี้, ใช้การแสดงวันที่แบบง่าย
    return new Date(dateString).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">ภาพรวมของระบบ</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm border border-gray-200 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "กำลังรีเฟรช..." : "รีเฟรช"}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-red-600 bg-red-50 border border-red-200 p-6 rounded-xl flex items-center gap-3">
          <AlertCircle size={24} />
          <div>
            <p className="font-medium">เกิดข้อผิดพลาด</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <div className="space-y-6">
          {/* Main Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="ผู้ใช้ทั้งหมด"
              value={totalUsers.toLocaleString()}
              icon={<Users className="text-blue-500" />}
            />
            <StatCard
              title="รายงานที่รอจัดการ"
              value={openReports.toLocaleString()}
              icon={<Flag className="text-red-500" />}
            />
            <StatCard
              title="สินค้าทั้งหมด"
              value={totalProducts.toLocaleString()}
              icon={<Package className="text-green-500" />}
            />
            <StatCard
              title="มูลค่าสินค้ารวม"
              value={`฿${totalProductValue.toLocaleString("th-TH")}`}
              icon={<DollarSign className="text-yellow-600" />}
            />
          </div>

          {/* 24-Hour Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="ผู้ใช้ใหม่ (24 ชม.)"
              value={`+${newUsers24h.toLocaleString()}`}
              icon={<UserPlus className="text-indigo-500" />}
              note="จำนวนผู้ใช้ที่สมัครใน 24 ชั่วโมงที่ผ่านมา"
            />
            <StatCard
              title="รายงานใหม่ (24 ชม.)"
              value={`+${newReports24h.toLocaleString()}`}
              icon={<FileText className="text-orange-500" />}
              note="รายงานที่ถูกส่งใน 24 ชั่วโมงที่ผ่านมา"
            />
          </div>

          {/* Recent Activity Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Open Reports */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
              <h2 className="text-lg font-semibold p-4 border-b border-gray-200">
                รายงานที่รอจัดการล่าสุด
              </h2>
              <div className="divide-y divide-gray-100">
                {recentOpenReports.length > 0 ? (
                  recentOpenReports.map((report) => (
                    <div
                      key={report._id}
                      className="p-4 flex justify-between items-start"
                    >
                      <div>
                        <p className="font-medium text-gray-800 line-clamp-1">
                          {report.type}
                        </p>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {report.message}
                        </p>
                      </div>
                      <span className="text-sm text-gray-400 flex-shrink-0 ml-4">
                        {formatTimeAgo(report.createdAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-gray-500">
                    ยอดเยี่ยม! ไม่มีรายงานที่รอจัดการ
                  </p>
                )}
              </div>
            </div>

            {/* Recent Users */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
              <h2 className="text-lg font-semibold p-4 border-b border-gray-200">
                ผู้ใช้ล่าสุด
              </h2>
              <div className="divide-y divide-gray-100">
                {recentUsers.length > 0 ? (
                  recentUsers.map((user) => (
                    <div
                      key={user._id}
                      className="p-4 flex justify-between items-start"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <span className="text-sm text-gray-400 flex-shrink-0 ml-4">
                        {formatTimeAgo(user.createdAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-gray-500">ไม่พบผู้ใช้ล่าสุด</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
