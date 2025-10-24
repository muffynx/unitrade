import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Heart,
    MessageCircle,
    MapPin,
    User,
    ArrowLeft,
    Search,
    Eye,
    Flag
} from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { th, enUS } from "date-fns/locale";
import '../i18n';
import { useTranslation } from 'react-i18next';

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

const Messages = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportTargetId, setReportTargetId] = useState('');
    const [reportReason, setReportReason] = useState('');

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

    const getDisplayCategory = (cat: string) => {
        const key = categoryKeyMap[cat] || `category_${cat}`;
        return t(key);
    };

    const getUrgencyBadge = (urgency: string) => {
        switch (urgency) {
            case 'high':
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">ด่วนมาก</span>;
            case 'medium':
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">ปานกลาง</span>;
            case 'low':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">ไม่รีบ</span>;
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

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
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
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const goToMessageDetail = (messageId: string) => {
        navigate(`/message/${messageId}`);
    };

    const handleReport = (targetId: string) => {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("กรุณาเข้าสู่ระบบก่อนรายงาน");
            navigate("/login");
            return;
        }
        setReportTargetId(targetId);
        setShowReportModal(true);
    };

    const submitReport = async () => {
        if (!reportReason.trim()) {
            alert("กรุณาระบุเหตุผลในการรายงาน");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
            
            await axios.post(
                `${API_URL}/api/reports`,
                {
                    type: 'MESSAGE',
                    targetId: reportTargetId,
                    reason: reportReason.trim(),
                    description: 'รายงานข้อความที่ไม่เหมาะสม'
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert("ส่งรายงานเรียบร้อยแล้ว ผู้ดูแลระบบจะตรวจสอบในเร็วๆ นี้");
            setShowReportModal(false);
            setReportReason('');
        } catch (err: any) {
            console.error('Report error:', err);
            alert(err.response?.data?.message || 'ไม่สามารถส่งรายงานได้');
        }
    };

    // Filter and sort messages
    const filteredMessages = messages
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

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">{t('loading_messages_message')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('all_messages_heading')}</h1>
                        <p className="text-gray-600">{t('all_messages_subtitle')}</p>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('search_messages_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="all">{t('category_all_items')}</option>
                        {categories.slice(1).map(cat => (
                            <option key={cat} value={cat}>{getDisplayCategory(cat)}</option>
                        ))}
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="newest">{t('sort_newest')}</option>
                        <option value="oldest">{t('sort_oldest')}</option>
                        <option value="most-liked">{t('sort_most_liked')}</option>
                        <option value="most-viewed">{t('sort_most_viewed')}</option>
                    </select>
                </div>

                {/* Results Count */}
                <div className="flex justify-between items-center">
                    <p className="text-gray-600">
                        {filteredMessages.length} {t('messages_found_label')}
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-center py-8">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={fetchMessages}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        {t('retry_button')}
                    </button>
                </div>
            )}

            {/* Messages Grid */}
            {filteredMessages.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {searchTerm ? t('no_search_results') : t('no_messages_found')}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm ? t('try_different_search') : t('be_first_to_post')}
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            {t('clear_search')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMessages.map((msg) => (
                        <div
                            key={msg._id}
                            className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => goToMessageDetail(msg._id)}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User size={16} className="text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{msg.user.name}</p>
                                        <p className="text-xs text-gray-400">{formatTime(msg.createdAt)}</p>
                                    </div>
                                </div>

                                {/* Badge */}
                                <span
                                    className={`px-3 py-1 text-xs rounded-full text-white ${getCategoryColor(msg.category)}`}
                                >
                                    {getDisplayCategory(msg.category)}
                                </span>
                            </div>

                            {/* Title and Description */}
                            <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{msg.title}</h4>
                            <p className="text-sm text-gray-500 line-clamp-3 mb-4">{msg.description}</p>

                            {/* Location and Budget */}
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                <div className="flex items-center gap-1">
                                    <MapPin size={14} />
                                    <span>{msg.location}</span>
                                </div>
                                {msg.budget && (
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold">งบ:</span>
                                        <span className="text-green-600 font-semibold">
                                            {msg.budget.toLocaleString()} บาท
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Urgency Badge */}
                            {getUrgencyBadge(msg.urgency)}

                            {/* Footer */}
                            <div className="flex items-center justify-between text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-4">
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
                                <div className="flex items-center gap-2">
                                    <span className="text-green-600 text-sm font-medium hover:underline">
                                        {t('view_detail_button')}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReport(msg._id);
                                        }}
                                        className="p-1 hover:bg-red-50 rounded-full transition-colors"
                                        title="รายงานความไม่เหมาะสม"
                                    >
                                        <Flag size={12} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md mx-4">
                        <div className="border-b border-gray-200 p-4">
                            <h3 className="text-lg font-semibold">รายงานข้อความที่ไม่เหมาะสม</h3>
                        </div>
                        
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        เหตุผลในการรายงาน
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
                                        <option value="harassment">การกลั่นแกล้ง</option>
                                        <option value="other">อื่นๆ</option>
                                    </select>
                                </div>
                                
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setShowReportModal(false);
                                            setReportReason('');
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

export default Messages;
