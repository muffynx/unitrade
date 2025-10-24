import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Clock,
    MapPin,
    User,
    ArrowLeft,
    Search,
    ListFilter,
    AlertCircle,
} from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { th, enUS } from "date-fns/locale";
import '../i18n';
import { useTranslation } from 'react-i18next';

interface Listing {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    condition: string;
    location: string;
    user: { 
        name: string;
        avatar?: string;
        profileImage?: string;
    };
    createdAt: string;
    sold?: boolean;
}

// ✅ Helper function to get avatar URL
const getAvatarUrl = (user: { name: string; avatar?: string; profileImage?: string }) => {
    return user.profileImage || user.avatar || 
           `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=64`;
};

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

const Listings = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    
    // ตั้งค่าเริ่มต้นจาก URL
    const initialCategoryFromUrl = new URLSearchParams(location.search).get('category')?.toLowerCase() || "all";
    const [selectedCategory, setSelectedCategory] = useState(initialCategoryFromUrl); 
    const [sortBy, setSortBy] = useState("newest");

    const formatTime = (dateString: string) => {
        const locale = i18n.language === 'th' ? th : enUS;
        return formatDistanceToNow(new Date(dateString), {
            addSuffix: true,
            locale: locale,
        });
    };

    const fetchListings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
            const response = await axios.get(`${API_URL}/api/product`);
            
            const products = response.data.map((product: any) => ({
                id: product._id,
                title: product.title,
                description: product.description,
                price: product.price,
                category: product.category?.toLowerCase() || "unknown",
                images: product.images || [],
                condition: product.condition,
                location: product.location,
                user: { 
                    name: product.user?.name || "Unknown",
                    avatar: product.user?.avatar,
                    profileImage: product.user?.profileImage,
                },
                createdAt: product.createdAt,
                sold: product.sold || false,
            }));
            
            setListings(products);
        } catch (err: any) {
            console.error("Fetch listings error:", err);
            setError(err.response?.data?.message || err.message || t("fetch_listings_error"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchListings();
        
        const params = new URLSearchParams(location.search);
        const categoryFromUrl = params.get('category')?.toLowerCase();
        
        if (categoryFromUrl && categories.includes(categoryFromUrl)) {
            setSelectedCategory(categoryFromUrl);
        } else {
            setSelectedCategory('all');
        }
    }, [location.search, fetchListings]);

    const goToProductDetail = (productId: string) => {
        navigate(`/product/${productId}`);
    };

    // ฟังก์ชันสำหรับอัปเดต URL เมื่อเปลี่ยน Category
    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        const newCategoryParam = category === 'all' ? '' : `?category=${category}`;
        navigate(`/listings${newCategoryParam}`, { replace: true });
    };

    // Filter and sort listings
    const filteredListings = listings
        .filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === "all" || item.category === selectedCategory; 
            const matchesSoldStatus = !item.sold;
            // กรองไม่ให้แสดงสินค้าของ Admin
            const isStudentProduct = item.user && item.user.name !== "Admin"; 
            return matchesSearch && matchesCategory && matchesSoldStatus && isStudentProduct;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "newest":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case "oldest":
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case "price-high":
                    return b.price - a.price;
                case "price-low":
                    return a.price - b.price;
                default:
                    return 0;
            }
        });

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">{t('loading_listings_message')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    title={t('back_button')}
                >
                    <ArrowLeft className="h-5 w-5 text-gray-700" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('all_listings_heading')}</h1>
                    <p className="text-gray-600">{t('all_listings_subtitle')}</p>
                </div>
            </div>

            {/* Search and Filters Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    {/* Filters Group */}
                    <div className="flex gap-4">
                        {/* Category Filter Dropdown */}
                        <div className="relative flex items-center">
                            <ListFilter className="absolute left-3 h-5 w-5 text-gray-400 pointer-events-none" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="w-full appearance-none pl-10 pr-10 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                            >
                                <option value="all">{t('category_all_items')}</option>
                                {categories.slice(1).map(cat => (
                                    <option key={cat} value={cat}>{getDisplayCategory(cat, t)}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Sort Dropdown */}
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full appearance-none px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                            >
                                <option value="newest">{t('sort_newest')}</option>
                                <option value="price-high">{t('sort_price_high')}</option>
                                <option value="price-low">{t('sort_price_low')}</option>
                                <option value="oldest">{t('sort_oldest')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-center py-8 bg-red-50 border border-red-200 rounded-xl mb-8">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <p className="text-red-600 font-medium mb-4">{error}</p>
                    <button
                        onClick={fetchListings}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        {t('retry_button')}
                    </button>
                </div>
            )}

            {/* Listings Grid */}
            {filteredListings.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl">
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-10 w-10 text-gray-500" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                        {searchTerm ? t('no_search_results') : t('no_listings_found')}
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        {searchTerm ? t('try_different_search') : t('be_first_to_list')}
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
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredListings.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                            onClick={() => goToProductDetail(item.id)}
                        >
                            <div className="relative aspect-video">
                                <img
                                    src={item.images[0] || "https://via.placeholder.com/400x300?text=No+Image"}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                        e.currentTarget.src = "https://via.placeholder.com/400x300?text=Image+Error";
                                    }}
                                />
                                <span
                                    className={`absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full text-white shadow-md ${getCategoryColor(item.category)}`}
                                >
                                    {getDisplayCategory(item.category, t)}
                                </span>
                            </div>

                            <div className="p-4">
                                <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 transition-colors group-hover:text-blue-600">
                                    {item.title}
                                </h3>
                                
                                <p className="text-2xl font-extrabold text-blue-600 my-2">
                                    {item.price.toLocaleString()} {t('currency_unit')}
                                </p>
                                
                                <div className="flex flex-col text-xs text-gray-500 border-t border-gray-100 pt-3 mt-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="flex-shrink-0 text-gray-400" />
                                        <span className="truncate">{item.location}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        {/* ✅ แสดง Avatar ของผู้ขาย */}
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={getAvatarUrl(item.user)}
                                                alt={item.user.name}
                                                className="w-5 h-5 rounded-full object-cover border border-gray-200"
                                                onError={(e) => {
                                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user.name)}&background=random&size=64`;
                                                }}
                                            />
                                            <span className="truncate">{item.user.name}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 text-right">
                                            <Clock size={14} className="flex-shrink-0 text-gray-400" />
                                            <span>{formatTime(item.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Listings;