import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Heart,
    MessageCircle,
    MapPin,
    User,
    ArrowLeft,
    Search,
    Eye,
    ListFilter,
    AlertCircle,
} from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { th, enUS } from "date-fns/locale";
import '../i18n';
import { useTranslation } from 'react-i18next';

// ... (Interface Message, categoryKeyMap, categories, getCategoryColor, getDisplayCategory
//      ยังคงเหมือนเดิมทุกอย่าง) ...

interface Message {
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
    };
    likes: string[];
    comments: any[];
    views: number;
    createdAt: string;
}

// Category mapping
const categoryKeyMap: Record<string, string> = {
    "all": "category_all_items",
    "electronics": "category_electronics",
    "furniture": "category_furniture",
    "textbooks": "category_textbooks",
    "sports": "category_sports",
    "unknown": "category_unknown",
};

const categories = ["all", "electronics", "furniture", "textbooks", "sports"];

const getCategoryColor = (category: string) => {
    switch (category) {
        case "electronics":
            return "bg-purple-500";
        case "textbooks":
            return "bg-green-500";
        case "furniture":
        case "unknown":
            return "bg-yellow-500";
        case "sports":
            return "bg-blue-500";
        default:
            return "bg-gray-500";
    }
};

const getDisplayCategory = (cat: string, t: (key: string) => string) => {
    const key = categoryKeyMap[cat] || `category_${cat}`;
    return t(key);
};


const Messages = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [sortBy, setSortBy] = useState("newest");

    // ✅ State สำหรับ Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10; // ⭐️ ตั้งค่าจำนวนรายการต่อหน้าที่นี่

    const getUrgencyBadge = (urgency: string) => {
        switch (urgency) {
            case 'high':
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">{t('urgency_high', 'ด่วนมาก')}</span>;
            case 'medium':
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">{t('urgency_medium', 'ปานกลาง')}</span>;
            case 'low':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">{t('urgency_low', 'ไม่รีบ')}</span>;
            default:
                return null;
        }
    };

    const formatTime = (dateString: string) => {
        const locale = i18n.language === 'th' ? th : enUS;
        return formatDistanceToNow(new Date(dateString), {
            addSuffix: true,
            locale: locale,
        });
    };

    const fetchMessages = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
            const response = await axios.get(`${API_URL}/api/messages`);

            const msgs = response.data.map((msg: any) => ({
                _id: msg._id,
                title: msg.title,
                description: msg.description,
                category: msg.category?.toLowerCase() || "unknown",
                location: msg.location,
                budget: msg.budget,
                urgency: msg.urgency,
                user: msg.user,
                likes: msg.likes || [],
                comments: msg.comments || [],
                views: msg.views || 0,
                createdAt: msg.createdAt,
            }));
            setMessages(msgs);
        } catch (err: any) {
            setError(err.message || t("fetch_messages_error"));
            console.error("Fetch messages error:", err);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const goToMessageDetail = (messageId: string) => {
        navigate(`/message/${messageId}`);
    };

    // ✅ useEffect นี้จะทำงานเมื่อมีการเปลี่ยนฟิลเตอร์
    // เพื่อ Reset หน้ากลับไปเป็นหน้า 1 เสมอ
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, sortBy]);


    // ✅ filteredMessages: ยังคงกรองข้อมูลทั้งหมด
    const filteredMessages = useMemo(() => {
        return messages
            .filter(msg => {
                const matchesSearch = msg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    msg.description.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = selectedCategory === "all" || msg.category === selectedCategory;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case "newest":
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    case "oldest":
                        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    case "most-liked":
                        return b.likes.length - a.likes.length;
                    case "most-viewed":
                        return b.views - a.views;
                    default:
                        return 0;
                }
            });
    }, [messages, searchTerm, selectedCategory, sortBy]);

    // ✅ คำนวณจำนวนหน้าทั้งหมด
    const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);

    // ✅ paginatedMessages: ตัดข้อมูลเฉพาะหน้าปัจจุบัน
    const paginatedMessages = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredMessages.slice(startIndex, endIndex);
    }, [filteredMessages, currentPage]);

    // ✅ ฟังก์ชันสำหรับเปลี่ยนหน้า
    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
        // เลื่อนหน้าจอขึ้นไปด้านบนเมื่อเปลี่ยนหน้า
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    if (loading) {
        // ... (Loading UI เหมือนเดิม) ...
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">{t('loading_messages_message')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header (เหมือนเดิม) */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    title={t('back_button')}
                >
                    <ArrowLeft className="h-5 w-5 text-gray-700" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('all_messages_heading')}</h1>
                    <p className="text-gray-600">{t('all_messages_subtitle')}</p>
                </div>
            </div>

            {/* Search and Filters Card (เหมือนเดิม) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('search_messages_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="relative flex items-center">
                            <ListFilter className="absolute left-3 h-5 w-5 text-gray-400 pointer-events-none" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full appearance-none pl-10 pr-10 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                            >
                                <option value="all">{t('category_all_items')}</option>
                                {categories.slice(1).map(cat => (
                                    <option key={cat} value={cat}>{getDisplayCategory(cat, t)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full appearance-none px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                            >
                                <option value="newest">{t('sort_newest')}</option>
                                <option value="oldest">{t('sort_oldest')}</option>
                                <option value="most-liked">{t('sort_most_liked')}</option>
                                <option value="most-viewed">{t('sort_most_viewed')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message (เหมือนเดิม) */}
            {error && (
                <div className="text-center py-8 bg-red-50 border border-red-200 rounded-xl mb-8">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <p className="text-red-600 font-medium mb-4">{error}</p>
                    <button
                        onClick={fetchMessages}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        {t('retry_button')}
                    </button>
                </div>
            )}

            {/* ✅ Empty State (เช็คจาก filteredMessages.length) */}
            {!error && filteredMessages.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-xl">
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="h-10 w-10 text-gray-500" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                        {searchTerm ? t('no_search_results') : t('no_messages_found')}
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        {searchTerm ? t('try_different_search') : t('be_first_to_post')}
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
                        >
                            {t('clear_search')}
                        </button>
                    )}
                </div>
            )}

            {/* ✅ Messages List (เช็คจาก filteredMessages.length) */}
            {filteredMessages.length > 0 && (
                <>
                    <div className="flex flex-col gap-4">
                        {/* ✅ วนลูปจาก paginatedMessages แทน */}
                        {paginatedMessages.map((msg) => (
                            <div
                                key={msg._id}
                                className="flex flex-col sm:flex-row items-start gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 cursor-pointer group"
                                onClick={() => goToMessageDetail(msg._id)}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mt-1">
                                    <User size={20} className="text-gray-500" />
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 mb-1 line-clamp-2 transition-colors group-hover:text-blue-600">
                                        {msg.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                        <span>{msg.user.name}</span>
                                        <span>&middot;</span>
                                        <span>{formatTime(msg.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                        {msg.description}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <span
                                            className={`px-3 py-1 text-xs rounded-full text-white ${getCategoryColor(msg.category)}`}
                                        >
                                            {getDisplayCategory(msg.category, t)}
                                        </span>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <MapPin size={14} />
                                            <span>{msg.location}</span>
                                        </div>
                                        {getUrgencyBadge(msg.urgency)}
                                    </div>
                                </div>
                                
                                {/* Stats (Right Side) */}
                                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-start sm:justify-center gap-3 text-sm text-gray-500 ml-auto pl-4 pt-2 sm:pt-0">
                                    <div className="flex items-center gap-1.5" title={`${msg.likes.length} ${t('likes_label')}`}>
                                        <span>{msg.likes.length}</span>
                                        <Heart size={16} className="text-gray-400" />
                                    </div>
                                    <div className="flex items-center gap-1.5" title={`${msg.comments.length} ${t('comments_label')}`}>
                                        <span>{msg.comments.length}</span>
                                        <MessageCircle size={16} className="text-gray-400" />
                                    </div>
                                    <div className="flex items-center gap-1.5" title={`${msg.views} ${t('views_label')}`}>
                                        <span>{msg.views}</span>
                                        <Eye size={16} className="text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ✅ ส่วนควบคุม Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {t('pagination_previous', 'Previous')}
                            </button>
                            <span className="text-sm text-gray-700">
                                {t('pagination_page', 'Page')} {currentPage} {t('pagination_of', 'of')} {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {t('pagination_next', 'Next')}
                            </button>
                        </div>
                    )}
                </>
            )}

        </div>
    );
};

export default Messages;