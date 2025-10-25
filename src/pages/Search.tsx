import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  User,
  ArrowLeft,
  Filter,
  AlertCircle,
  Package,
  MessageSquare,
  Heart,
  MessageCircle,
  Eye,
  DollarSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

type Product = {
  _id: string;
  title: string;
  price: number;
  images: string[];
  category?: string;
  location?: string;
  user?: {
    name: string;
    avatar?: string;
    profileImage?: string;
  };
  createdAt?: string;
  sold?: boolean;
  condition?: string;
  description?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
};

type Message = {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budget?: number;
  urgency: string;
  user: {
    _id: string;
    name: string;
    avatar?: string;
    profileImage?: string;
  };
  likes: string[];
  comments: Array<{ _id: string }>;
  views: number;
  createdAt: string;
  status: string;
};

const getAvatarUrl = (user: {
  name: string;
  avatar?: string;
  profileImage?: string;
}) => {
  return (
    user.profileImage ||
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.name
    )}&background=random&size=64`
  );
};

const categoryMap: Record<string, string> = {
  electronics: "เครื่องใช้ไฟฟ้า",
  furniture: "เฟอร์นิเจอร์",
  textbooks: "หนังสือเรียน",
  sports: "กีฬา",
  fashion: "แฟชั่น",
  books: "หนังสือ",
  others: "อื่นๆ",
};

const getCategoryColor = (category?: string) => {
  switch (category?.toLowerCase()) {
    case "electronics":
      return "bg-purple-500";
    case "textbooks":
    case "books":
      return "bg-green-500";
    case "furniture":
      return "bg-yellow-500";
    case "sports":
      return "bg-blue-500";
    case "fashion":
      return "bg-pink-500";
    default:
      return "bg-gray-500";
  }
};

const CATEGORY_OPTIONS = [
  { value: "electronics", label: "เครื่องใช้ไฟฟ้า" },
  { value: "furniture", label: "เฟอร์นิเจอร์" },
  { value: "textbooks", label: "หนังสือเรียน" },
  { value: "sports", label: "กีฬา" },
  { value: "fashion", label: "แฟชั่น" },
  { value: "books", label: "หนังสือ" },
  { value: "others", label: "อื่นๆ" },
];

const CONDITION_OPTIONS = [
  { value: "new", label: "ใหม่" },
  { value: "used_like_new", label: "มือสอง - เหมือนใหม่" },
  { value: "used_good", label: "มือสอง - สภาพดี" },
  { value: "used_fair", label: "มือสอง - พอใช้" },
];

const URGENCY_OPTIONS = [
  { value: "high", label: "ด่วนมาก" },
  { value: "medium", label: "ปานกลาง" },
  { value: "low", label: "ไม่รีบ" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "เปิดรับอยู่" },
  { value: "closed", label: "ปิดแล้ว" },
];

const PRICE_STEPS = ["", "500", "1000", "5000", "10000", "20000", "50000"];

const UnifiedSearch = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // Tab state
  const typeParam = params.get("type") || "products";
  const [searchType, setSearchType] = useState<"products" | "messages">(
    typeParam === "messages" ? "messages" : "products"
  );

  // Common params
  const qParam = params.get("q") || "";
  const categoryParam = params.get("category") || "";
  const locationParam = params.get("location") || "";
  const sortParam = params.get("sort") || "newest";
  const pageParam = Math.max(1, parseInt(params.get("page") || "1", 10));

  // Product-specific params
  const conditionParam = params.get("condition") || "";
  const minPriceParam = params.get("minPrice") || "";
  const maxPriceParam = params.get("maxPrice") || "";

  // Message-specific params
  const urgencyParam = params.get("urgency") || "";
  const statusParam = params.get("status") || "";
  const minBudgetParam = params.get("minBudget") || "";
  const maxBudgetParam = params.get("maxBudget") || "";

  const [query, setQuery] = useState(qParam);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [category, setCategory] = useState(categoryParam);
  const [location, setLocation] = useState(locationParam);
  const [condition, setCondition] = useState(conditionParam);
  const [urgency, setUrgency] = useState(urgencyParam);
  const [status, setStatus] = useState(statusParam);
  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);
  const [minBudget, setMinBudget] = useState(minBudgetParam);
  const [maxBudget, setMaxBudget] = useState(maxBudgetParam);
  const [sort, setSort] = useState(sortParam);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [page, setPage] = useState<number>(pageParam);
  const [error, setError] = useState<string | null>(null);

  const API_URL = useMemo(
    () => import.meta.env.VITE_API_URL || "https://unitrade5.onrender.com",
    []
  );

  // Sync URL params with local state
  useEffect(() => {
    setQuery(qParam);
    setCategory(categoryParam);
    setLocation(locationParam);
    setCondition(conditionParam);
    setUrgency(urgencyParam);
    setStatus(statusParam);
    setMinPrice(minPriceParam);
    setMaxPrice(maxPriceParam);
    setMinBudget(minBudgetParam);
    setMaxBudget(maxBudgetParam);
    setSort(sortParam);
    setPage(pageParam);
    setSearchType(typeParam === "messages" ? "messages" : "products");
  }, [
    qParam,
    categoryParam,
    locationParam,
    conditionParam,
    urgencyParam,
    statusParam,
    minPriceParam,
    maxPriceParam,
    minBudgetParam,
    maxBudgetParam,
    sortParam,
    pageParam,
    typeParam,
  ]);

  // Fetch data based on search type
  useEffect(() => {
    const runSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchParams: Record<string, string> = {};
        if (qParam) searchParams.q = qParam;
        if (categoryParam) searchParams.category = categoryParam;
        if (locationParam) searchParams.location = locationParam;

        if (searchType === "products") {
          searchParams.sold = "false";
          if (conditionParam) searchParams.condition = conditionParam;
          if (minPriceParam) searchParams.minPrice = minPriceParam;
          if (maxPriceParam) searchParams.maxPrice = maxPriceParam;
          if (sortParam) searchParams.sort = sortParam;

          const res = await axios.get(`${API_URL}/api/products`, {
            params: searchParams,
          });
          setProducts(res.data || []);
        } else {
          if (urgencyParam) searchParams.urgency = urgencyParam;
          if (statusParam) searchParams.status = statusParam;
          if (minBudgetParam) searchParams.minBudget = minBudgetParam;
          if (maxBudgetParam) searchParams.maxBudget = maxBudgetParam;
          if (sortParam) searchParams.sort = sortParam;

          const res = await axios.get(`${API_URL}/api/messages`, {
            params: searchParams,
          });
          setMessages(res.data || []);
        }
      } catch (err: any) {
        console.error("Search error:", err);
        setError(
          err.response?.data?.message ||
            "เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่อีกครั้ง"
        );
        setProducts([]);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    runSearch();
  }, [
    API_URL,
    searchType,
    qParam,
    categoryParam,
    locationParam,
    conditionParam,
    urgencyParam,
    statusParam,
    minPriceParam,
    maxPriceParam,
    minBudgetParam,
    maxBudgetParam,
    sortParam,
  ]);

  // Fetch locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const endpoint =
          searchType === "products"
            ? `${API_URL}/api/products/locations`
            : `${API_URL}/api/messages`; 

        const res = await axios.get(endpoint);

        if (searchType === "products") {
          setLocationOptions(res.data?.locations || []);
        } else {
          const msgs: Message[] = res.data || [];
          const uniqueLocations = [
            ...new Set(msgs.map((m) => m.location).filter(Boolean)),
          ];
          setLocationOptions(uniqueLocations.sort());
        }
      } catch (err) {
        console.error("Load locations error:", err);
        // Fallback locations
        setLocationOptions([
          "มหาวิทยาลัยเกษตรศาสตร์",
          "จุฬาลงกรณ์มหาวิทยาลัย",
          "มหาวิทยาลัยธรรมศาสตร์",
          "มหาวิทยาลัยมหิดล",
          "มหาวิทยาลัยศรีนครินทรวิโรฒ",
          "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี",
          "มหาวิทยาลัยศิลปากร",
          "มหาวิทยาลัยเชียงใหม่",
          "มหาวิทยาลัยขอนแก่น",
          "มหาวิทยาลัยสงขลานครินทร์",
          "มหาวิทยาลัยนเรศวร",
          "มหาวิทยาลัยบูรพา",
          "มหาวิทยาลัยแม่ฟ้าหลวง",
          "อื่นๆ",
        ]);
      }
    };
    loadLocations();
  }, [API_URL, searchType]);

  const updateParams = (newFilters: Record<string, string>) => {
    const filtered = Object.fromEntries(
      Object.entries(newFilters).filter(([_, value]) => value !== "")
    );
    setParams(filtered);
  };

  const handleTypeChange = (type: "products" | "messages") => {
    setSearchType(type);
    // Reset filters when switching types
    const resetParams: Record<string, string> = {
      type,
      page: "1",
    };

    // Keep only common filters
    if (query.trim()) resetParams.q = query.trim();
    if (category) resetParams.category = category;
    if (location) resetParams.location = location;
    if (sort !== "newest") resetParams.sort = sort;

    updateParams(resetParams);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const baseParams: Record<string, string> = {
      type: searchType,
      ...(query.trim() && { q: query.trim() }),
      ...(category && { category }),
      ...(location && { location }),
      ...(sort !== "newest" && { sort }),
      page: "1",
    };

    if (searchType === "products") {
      updateParams({
        ...baseParams,
        ...(condition && { condition }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice }),
      });
    } else {
      updateParams({
        ...baseParams,
        ...(urgency && { urgency }),
        ...(status && { status }),
        ...(minBudget && { minBudget }),
        ...(maxBudget && { maxBudget }),
      });
    }
  };

  const onClear = () => {
    setQuery("");
    setCategory("");
    setLocation("");
    setCondition("");
    setUrgency("");
    setStatus("");
    setMinPrice("");
    setMaxPrice("");
    setMinBudget("");
    setMaxBudget("");
    setSort("newest");
    updateParams({ type: searchType });
  };

  const sortedResults = useMemo(() => {
    if (searchType === "products") {
      const studentProducts = products.filter(
        (item) => item.user?.name && item.user.name !== "Admin" && !item.sold
      );

      const copy = [...studentProducts];
      switch (sort) {
        case "price_low":
          return copy.sort((a, b) => Number(a.price) - Number(b.price));
        case "price_high":
          return copy.sort((a, b) => Number(b.price) - Number(a.price));
        case "newest":
        default:
          return copy.sort((a, b) => {
            const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return db - da;
          });
      }
    } else {
      const copy = [...messages];
      switch (sort) {
        case "budget_low":
          return copy.sort((a, b) => (a.budget || 0) - (b.budget || 0));
        case "budget_high":
          return copy.sort((a, b) => (b.budget || 0) - (a.budget || 0));
        case "popular":
          return copy.sort((a, b) => b.likes.length - a.likes.length);
        case "newest":
        default:
          return copy.sort((a, b) => {
            const da = new Date(a.createdAt).getTime();
            const db = new Date(b.createdAt).getTime();
            return db - da;
          });
      }
    }
  }, [products, messages, searchType, sort]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedResults = sortedResults.slice(startIndex, startIndex + pageSize);

  const goToPage = (p: number) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    const baseParams: Record<string, string> = {
      type: searchType,
      ...(query.trim() && { q: query.trim() }),
      ...(category && { category }),
      ...(location && { location }),
      ...(sort !== "newest" && { sort }),
      page: String(clamped),
    };

    if (searchType === "products") {
      updateParams({
        ...baseParams,
        ...(condition && { condition }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice }),
      });
    } else {
      updateParams({
        ...baseParams,
        ...(urgency && { urgency }),
        ...(status && { status }),
        ...(minBudget && { minBudget }),
        ...(maxBudget && { maxBudget }),
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: th,
      });
    } catch {
      return "-";
    }
  };

  const activeFiltersCount =
    searchType === "products"
      ? [category, location, condition, minPrice, maxPrice].filter(Boolean)
          .length
      : [category, location, urgency, status, minBudget, maxBudget].filter(
          Boolean
        ).length;

  return (
    <div className="w-full min-h-screen bg-gray-50 font-sarabun">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-sm border border-gray-200"
            title="กลับไปหน้าก่อนหน้า"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ค้นหา</h1>
            <p className="text-gray-600">ค้นหาสินค้าและข้อความจากนักศึกษา</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-2 mb-6 inline-flex">
          <button
            onClick={() => handleTypeChange("products")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
              searchType === "products"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Package size={18} />
            สินค้า
          </button>
          <button
            onClick={() => handleTypeChange("messages")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
              searchType === "messages"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <MessageSquare size={18} />
            ข้อความ
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
          <form
            onSubmit={onSubmit}
            className="flex gap-3 flex-wrap sm:flex-nowrap"
          >
            <div className="flex-1 relative w-full">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  searchType === "products"
                    ? "ค้นหาสินค้า เช่น โน้ตบุ๊ค, โต๊ะทำงาน..."
                    : "ค้นหาข้อความ เช่น หาโน้ตบุ๊ค, รับซื้อตู้เสื้อผ้า..."
                }
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2 border border-gray-300 relative"
            >
              <SlidersHorizontal className="h-5 w-5" />
              <span className="hidden sm:inline">ตัวกรอง</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              ค้นหา
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Filters */}
          {filtersOpen && (
            <aside className="lg:col-span-3">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      ตัวกรอง
                    </h3>
                  </div>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="lg:hidden p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      หมวดหมู่
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    >
                      <option value="">ทั้งหมด</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      สถานที่
                    </label>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    >
                      <option value="">ทั้งหมด</option>
                      {locationOptions.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Product-specific filters */}
                  {searchType === "products" && (
                    <>
                      {/* Condition */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          สภาพสินค้า
                        </label>
                        <select
                          value={condition}
                          onChange={(e) => setCondition(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                        >
                          <option value="">ทั้งหมด</option>
                          {CONDITION_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Price Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ช่วงราคา
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                          >
                            <option value="">ต่ำสุด</option>
                            {PRICE_STEPS.filter((p) => p).map((p) => (
                              <option key={p} value={p}>
                                ฿{Number(p).toLocaleString("th-TH")}
                              </option>
                            ))}
                          </select>
                          <select
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                          >
                            <option value="">สูงสุด</option>
                            {PRICE_STEPS.filter(
                              (p) =>
                                p &&
                                (!minPrice || Number(p) >= Number(minPrice))
                            ).map((p) => (
                              <option key={p} value={p}>
                                ฿{Number(p).toLocaleString("th-TH")}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Message-specific filters */}
                  {searchType === "messages" && (
                    <>
                      {/* Urgency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ความเร่งด่วน
                        </label>
                        <select
                          value={urgency}
                          onChange={(e) => setUrgency(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                        >
                          <option value="">ทั้งหมด</option>
                          {URGENCY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          สถานะ
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                        >
                          <option value="">ทั้งหมด</option>
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Budget Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          งบประมาณ
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={minBudget}
                            onChange={(e) => setMinBudget(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                          >
                            <option value="">ต่ำสุด</option>
                            {PRICE_STEPS.filter((p) => p).map((p) => (
                              <option key={p} value={p}>
                                ฿{Number(p).toLocaleString("th-TH")}
                              </option>
                            ))}
                          </select>
                          <select
                            value={maxBudget}
                            onChange={(e) => setMaxBudget(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                          >
                            <option value="">สูงสุด</option>
                            {PRICE_STEPS.filter(
                              (p) =>
                                p &&
                                (!minBudget || Number(p) >= Number(minBudget))
                            ).map((p) => (
                              <option key={p} value={p}>
                                ฿{Number(p).toLocaleString("th-TH")}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Sort */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      จัดเรียง
                    </label>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    >
                      <option value="newest">ใหม่ล่าสุด</option>
                      {searchType === "products" ? (
                        <>
                          <option value="price_low">ราคาต่ำไปสูง</option>
                          <option value="price_high">ราคาสูงไปต่ำ</option>
                        </>
                      ) : (
                        <>
                          <option value="popular">ยอดนิยม</option>
                          <option value="budget_low">งบประมาณต่ำไปสูง</option>
                          <option value="budget_high">งบประมาณสูงไปต่ำ</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClear}
                      className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors font-medium"
                    >
                      ล้างทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={onSubmit}
                      className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors font-medium"
                    >
                      ใช้ตัวกรอง
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* Results */}
          <main className={filtersOpen ? "lg:col-span-9" : "lg:col-span-12"}>
            {/* Results Header */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {loading
                      ? "กำลังค้นหา..."
                      : `พบ ${sortedResults.length} รายการ`}
                  </h2>
                  {query && (
                    <p className="text-sm text-gray-500 mt-1">
                      ผลการค้นหา: "<span className="font-medium">{query}</span>"
                    </p>
                  )}
                </div>
                {!filtersOpen && (
                  <button
                    onClick={() => setFiltersOpen(true)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 border border-gray-300 relative"
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                    <span className="hidden sm:inline">แสดงตัวกรอง</span>
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-900">
                      เกิดข้อผิดพลาด
                    </h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div
                className={
                  searchType === "products"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                    : "space-y-4"
                }
              >
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse"
                    >
                      {searchType === "products" ? (
                        <>
                          <div className="aspect-video bg-gray-200"></div>
                          <div className="p-4 space-y-3">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </>
                      ) : (
                        <div className="p-6">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                          <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : sortedResults.length === 0 ? (
              /* Empty State */
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SearchIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  ไม่พบ{searchType === "products" ? "สินค้า" : "ข้อความ"}
                  ที่ค้นหา
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองใหม่
                </p>
                <button
                  onClick={onClear}
                  className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            ) : (
              <>
                {/* Results Display */}
                {searchType === "products" ? (
                  /* Products Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6">
                    {(pagedResults as Product[]).map((p) => (
                      <div
                        key={p._id}
                        onClick={() => navigate(`/product/${p._id}`)}
                        className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group"
                      >
                        <div className="relative aspect-video bg-gray-100">
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt={p.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src =
                                  "https://via.placeholder.com/400x300?text=No+Image";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <SearchIcon className="h-12 w-12" />
                            </div>
                          )}
                          {p.category && (
                            <span
                              className={`absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full text-white shadow-md ${getCategoryColor(
                                p.category
                              )}`}
                            >
                              {categoryMap[p.category.toLowerCase()] ||
                                p.category}
                            </span>
                          )}
                        </div>

                        <div className="p-4">
                          <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors min-h-[3rem]">
                            {p.title}
                          </h3>

                          <p className="text-2xl font-extrabold text-blue-600 mb-3">
                            ฿{Number(p.price).toLocaleString("th-TH")}
                          </p>

                          <div className="space-y-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
                            {p.location && (
                              <div className="flex items-center gap-2">
                                <MapPin
                                  size={14}
                                  className="flex-shrink-0 text-gray-400"
                                />
                                <span className="truncate">{p.location}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              {p.user && (
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={getAvatarUrl(p.user)}
                                    alt={p.user.name}
                                    className="w-5 h-5 rounded-full object-cover border border-gray-200 flex-shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        p.user!.name
                                      )}&background=random&size=64`;
                                    }}
                                  />
                                  <span className="truncate">
                                    {p.user.name}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-1 text-right flex-shrink-0">
                                <Clock
                                  size={14}
                                  className="flex-shrink-0 text-gray-400"
                                />
                                <span className="whitespace-nowrap">
                                  {formatTime(p.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Messages List */
                  <div className="space-y-4 mb-6">
                    {(pagedResults as Message[]).map((msg) => (
                      <div
                        key={msg._id}
                        onClick={() => navigate(`/message/${msg._id}`)}
                        className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <img
                              src={getAvatarUrl(msg.user)}
                              alt={msg.user.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  msg.user.name
                                )}&background=random&size=64`;
                              }}
                            />
                            <div>
                              <p className="font-medium text-gray-900">
                                {msg.user.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full text-white ${getCategoryColor(
                                msg.category
                              )}`}
                            >
                              {categoryMap[msg.category] || msg.category}
                            </span>
                            {msg.status === "closed" && (
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                                ปิดแล้ว
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {msg.title}
                        </h3>

                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {msg.description}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                          {msg.location && (
                            <div className="flex items-center gap-1">
                              <MapPin size={14} />
                              <span>{msg.location}</span>
                            </div>
                          )}
                          {msg.budget && (
                            <div className="flex items-center gap-1">
                              <DollarSign size={14} />
                              <span className="font-medium text-blue-600">
                                {msg.budget.toLocaleString()} ฿
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Heart size={14} />
                              <span>{msg.likes.length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle size={14} />
                              <span>{msg.comments.length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye size={14} />
                              <span>{msg.views}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="text-sm text-gray-600">
                        หน้า{" "}
                        <span className="font-semibold">{currentPage}</span> จาก{" "}
                        <span className="font-semibold">{totalPages}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          disabled={currentPage <= 1}
                          aria-label="หน้าก่อนหน้า"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>

                        {/* Page Numbers */}
                        <div className="hidden sm:flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, idx) => {
                              const base = Math.max(
                                1,
                                Math.min(currentPage - 2, totalPages - 4)
                              );
                              const pageNum = base + idx;
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => goToPage(pageNum)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    pageNum === currentPage
                                      ? "bg-blue-600 text-white"
                                      : "text-gray-700 hover:bg-gray-100 border border-gray-300"
                                  }`}
                                  aria-label={`ไปหน้า ${pageNum}`}
                                  aria-current={
                                    pageNum === currentPage ? "page" : undefined
                                  }
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                          )}
                        </div>

                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          disabled={currentPage >= totalPages}
                          aria-label="หน้าถัดไป"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default UnifiedSearch;
