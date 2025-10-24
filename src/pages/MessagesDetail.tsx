import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Clock, 
  MapPin,
  Send,
  Mail,
  Eye,
  ChevronRight,
  DollarSign,
  AlertCircle,
  Share2,
  Flag,
  Shield,
  X,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

// ✅ UPDATED Interface with profileImage support
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
    email?: string;
    avatar?: string;
    profileImage?: string;
  };
  likes: string[];
  comments: Array<{
    _id: string;
    user: {
      _id: string;
      name: string;
      avatar?: string;
      profileImage?: string;
    };
    text: string;
    createdAt: string;
  }>;
  views: number;
  createdAt: string;
  status: string;
}

const MessageDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState<Message | null>(null);
  const [relatedMessages, setRelatedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(decoded.id);
      } catch (err) {
        console.error('Token decode error:', err);
      }
    }

    if (id) {
      fetchMessage();
    }
  }, [id]);

  const fetchMessage = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/api/messages/${id}`);
      setMessage(response.data);

      const token = localStorage.getItem('token');
      if (token) {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setIsLiked(response.data.likes.includes(decoded.id));
      }

      const relatedResponse = await axios.get(
        `${API_URL}/api/messages?category=${response.data.category}`
      );
      setRelatedMessages(
        relatedResponse.data
          .filter((msg: Message) => msg._id !== id)
          .slice(0, 4)
      );

    } catch (err: any) {
      console.error('Fetch message error:', err);
      setError(err.response?.data?.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('กรุณาเข้าสู่ระบบก่อนกดถูกใจ');
      navigate('/login');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/messages/${id}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLiked(!isLiked);
      fetchMessage();
    } catch (err: any) {
      console.error('Like error:', err);
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim()) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น');
      navigate('/login');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/messages/${id}/comment`,
        { text: reply.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setReply('');
      fetchMessage();
    } catch (err: any) {
      console.error('Comment error:', err);
      alert(err.response?.data?.message || 'ไม่สามารถส่งความคิดเห็นได้');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('คุณต้องการลบความคิดเห็นนี้หรือไม่?')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await axios.delete(
        `${API_URL}/api/messages/${id}/comment/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchMessage();
    } catch (err: any) {
      console.error('Delete comment error:', err);
      alert(err.response?.data?.message || 'ไม่สามารถลบความคิดเห็นได้');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: message?.title,
        text: message?.description,
        url: window.location.href,
      }).catch((err) => console.error('Share error:', err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('คัดลอกลิงก์สำเร็จ!');
    }
  };

  const handleReport = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('กรุณาเข้าสู่ระบบก่อนรายงาน');
      navigate('/login');
      return;
    }
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      alert("กรุณาเลือกเหตุผลในการรายงาน");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/reports`,
        {
          type: 'MESSAGE',
          targetId: message?._id,
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

  const handleContact = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('กรุณาเข้าสู่ระบบเพื่อเริ่มแชท');
      navigate('/login');
      return;
    }

    if (!message) return;

    if (currentUserId === message.user._id) {
      alert('ไม่สามารถแชทกับตัวเองได้');
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/conversations`,
        {
          participantId: message.user._id,
          messageId: message._id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      navigate(`/chat/${response.data._id}`);
    } catch (err: any) {
      console.error('Contact error:', err);
      alert(err.response?.data?.message || 'ไม่สามารถเริ่มการสนทนาได้');
    }
  };

  // ✅ Helper function to get avatar URL
  const getAvatarUrl = (user: { avatar?: string; profileImage?: string; name: string }) => {
    return user.profileImage || user.avatar || 
           `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=128`;
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: th,
    });
  };

  const getCategoryColor = (category: string) => {
    const lowerCategory = category.toLowerCase();
    switch (lowerCategory) {
      case 'electronics':
        return 'bg-purple-500';
      case 'textbooks':
        return 'bg-green-500';
      case 'furniture':
        return 'bg-yellow-500';
      case 'sports':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    const lowerCategory = category.toLowerCase();
    switch (lowerCategory) {
      case 'electronics':
        return 'เครื่องใช้ไฟฟ้า';
      case 'textbooks':
        return 'หนังสือเรียน';
      case 'furniture':
        return 'เฟอร์นิเจอร์';
      case 'sports':
        return 'กีฬา';
      default:
        return category;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 border border-red-200">
            <AlertCircle size={12} />
            ด่วนมาก
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
            <Clock size={12} />
            ปานกลาง
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 border border-green-200">
            <CheckCircle size={12} />
            ไม่รีบ
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-2xl p-6 border">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="text-center py-20">
          <AlertCircle size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            {error || 'ไม่พบข้อความที่ต้องการ'}
          </h2>
          <p className="text-gray-500 mb-6">ข้อความที่คุณกำลังมองหาอาจถูกลบหรือไม่มีอยู่</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-900 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={16} />
              กลับไปหน้าก่อนหน้า
            </button>
            <Link 
              to="/messages"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
            >
              เรียกดูข้อความทั้งหมด
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back Button */}
      <div className="mb-4">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors px-2 py-1"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">กลับไปหน้าก่อนหน้า</span>
        </button>
      </div>

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-900">หน้าแรก</Link>
        <ChevronRight size={14} />
        <Link to="/messages" className="hover:text-gray-900">ข้อความ</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium truncate max-w-md">
          {message.title}
        </span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Message Content Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
  <button
    onClick={() => navigate(`/profile-look/${message.user._id}`)}
    className="focus:outline-none"
    title={`ดูโปรไฟล์ของ ${message.user.name}`}
    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
  >
    <img
      src={getAvatarUrl(message.user)}
      alt={message.user.name}
      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 hover:ring-2 hover:ring-blue-400 transition-all"
      onError={(e) => {
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.user.name)}&background=random&size=128`;
      }}
    />
  </button>
  <div className="flex-1">
    <h3
      className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
      onClick={() => navigate(`/profile-look/${message.user._id}`)}
      title={`ดูโปรไฟล์ของ ${message.user.name}`}
    >
      {message.user.name}
    </h3>
    <p className="text-sm text-gray-500">นักศึกษามหาวิทยาลัย</p>
    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
      <Clock size={12} />
      <span>{formatTime(message.createdAt)}</span>
    </div>
  </div>
</div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="แชร์"
                  >
                    <Share2 size={18} className="text-gray-600" />
                  </button>
                  <button
                    onClick={handleReport}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="รายงาน"
                  >
                    <Flag size={18} className="text-gray-600 hover:text-red-600" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1.5 text-xs font-medium rounded-full text-white ${getCategoryColor(message.category)}`}>
                  {getCategoryLabel(message.category)}
                </span>
                {getUrgencyBadge(message.urgency)}
                {message.status === 'closed' && (
                  <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    ปิดแล้ว
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">{message.title}</h1>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{message.description}</p>
            </div>

            {/* Details */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <MapPin size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">สถานที่</p>
                    <p className="text-sm font-medium text-gray-900">{message.location}</p>
                  </div>
                </div>
                
                {message.budget && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <DollarSign size={18} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">งบประมาณ</p>
                      <p className="text-sm font-medium text-blue-600">
                        {message.budget.toLocaleString()} บาท
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-2 text-sm font-medium ${isLiked ? 'text-red-600' : 'text-gray-600'} hover:text-red-600 transition-colors`}
                  >
                    <Heart size={18} fill={isLiked ? '#dc2626' : 'none'} />
                    <span>{message.likes.length}</span>
                  </button>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <MessageCircle size={18} />
                    <span>{message.comments.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <Eye size={18} />
                    <span>{message.views}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageCircle size={18} />
                ความคิดเห็น ({message.comments.length})
              </h3>
              
              {message.comments.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {message.comments.map((comment) => (
                    <div key={comment._id} className="flex gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
    {/* ✅ คลิกดูโปรไฟล์คนคอมเมนต์ */}
    <button
      onClick={() => navigate(`/profile-look/${comment.user._id}`)}
      className="focus:outline-none"
      title={`ดูโปรไฟล์ของ ${comment.user.name}`}
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
    >
      <img
        src={getAvatarUrl(comment.user)}
        alt={comment.user.name}
        className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all"
        onError={e => {
          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=random&size=128`;
        }}
      />
    </button>
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
            onClick={() => navigate(`/profile-look/${comment.user._id}`)}
            title={`ดูโปรไฟล์ของ ${comment.user.name}`}
          >
            {comment.user.name}
          </span>
          <span className="text-xs text-gray-400">
            {formatTime(comment.createdAt)}
          </span>
        </div>
        {currentUserId === comment.user._id && (
          <button
            onClick={() => handleDeleteComment(comment._id)}
            className="text-xs text-red-600 hover:text-red-700"
          >
            ลบ
          </button>
        )}
      </div>
      <p className="text-sm text-gray-700">{comment.text}</p>
    </div>
  </div>
))}
                </div>
              ) : (
                <div className="text-center py-8 mb-6 bg-gray-50 rounded-xl border border-gray-100">
                  <MessageCircle size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">ยังไม่มีความคิดเห็น</p>
                </div>
              )}

              {/* Reply Input */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">แสดงความคิดเห็น</h4>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="เขียนความคิดเห็นของคุณ..."
                  className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handleSendReply}
                    disabled={!reply.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <Send size={16} />
                    ส่งความคิดเห็น
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">ติดต่อผู้โพสต์</h3>
            
            <div className="space-y-3">
              <button
                onClick={handleContact}
                disabled={currentUserId === message.user._id}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <MessageCircle size={18} />
                {currentUserId === message.user._id ? 'โพสต์ของคุณ' : 'เริ่มแชท'}
              </button>
              
              {message.user.email && currentUserId !== message.user._id && (
                <a
                  href={`mailto:${message.user.email}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  <Mail size={18} />
                  ส่งอีเมล
                </a>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Shield className="h-4 w-4" />
                <span>ความปลอดภัย</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1.5">
                <li>• พบหน้าในสถานที่สาธารณะ</li>
                <li>• ตรวจสอบตัวตนผ่าน Email มหาวิทยาลัย</li>
                <li>• อย่าโอนเงินล่วงหน้า</li>
              </ul>
            </div>
          </div>

          {/* Related Messages */}
          {relatedMessages.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">ข้อความที่เกี่ยวข้อง</h3>
              <div className="space-y-3">
                {relatedMessages.map((relatedMsg) => (
                  <div
                    key={relatedMsg._id}
                    className="p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group"
                    onClick={() => navigate(`/message/${relatedMsg._id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full text-white ${getCategoryColor(relatedMsg.category)}`}>
                        {getCategoryLabel(relatedMsg.category)}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-600">
                      {relatedMsg.title}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {relatedMsg.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {formatTime(relatedMsg.createdAt)}
                      </span>
                      <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-600" />
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to={`/messages?category=${message.category}`}
                className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium mt-4"
              >
                ดูทั้งหมดในหมวด {getCategoryLabel(message.category)}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">รายงานข้อความ</h3>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
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
                    <option value="scam">หลอกลวง</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800">
                      การรายงานจะถูกส่งไปยังผู้ดูแลระบบเพื่อตรวจสอบ 
                      กรุณารายงานเฉพาะกรณีที่มีเนื้อหาไม่เหมาะสมจริงๆ เท่านั้น
                    </p>
                  </div>
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

export default MessageDetail;