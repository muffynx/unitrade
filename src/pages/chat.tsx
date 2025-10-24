import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Send, ArrowLeft, User, Image, MoreVertical, Paperclip, Plus, Flag, ExternalLink, MapPin, CheckCircle, AlertCircle, Bell, X, Star, Menu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

interface Chat {
  _id: string;
  conversationId: string;
  sender: {
    _id: string;
    name: string;
  };
  content: string;
  createdAt: string;
  read: boolean;
  type?: 'text' | 'image' | 'location';
  imageUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  attachments?: Array<{
    url: string;
    filename: string;
    fileType: string;
    fileSize: number;
  }>;
}

interface Conversation {
  _id: string;
  product?: {
    _id: string;
    title: string;
    price: number;
    images: string[];
    sold?: boolean;
    sellerId: string; 
  };
  message?: {
    _id: string;
    title: string;
  };
  participants: Array<{
    _id: string;
    name: string;
    profilePicture?: string;
  }>;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount?: number;
  isActive?: boolean;
  isCompleted?: boolean;
  completedAt?: string;
  buyerId?: string;
}

interface UserProfile {
  _id: string;
  name: string;
  profilePicture?: string;
  completedTrades?: number;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  status: "sent" | "read" | "pending";
  createdAt: string;
  readAt?: string;
  sentBy: {
    _id: string;
    name: string;
    email: string;
  };
  conversationId?: string; 
  productId?: string; 
}

const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { conversationId: urlConversationId } = useParams<{ conversationId: string }>();

  const [submittingReview, setSubmittingReview] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showReviewMenu, setShowReviewMenu] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [attaching, setAttaching] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true); // Mobile sidebar toggle

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const productId = searchParams.get('productId');
  const sellerId = searchParams.get('sellerId');
  const messageId = searchParams.get('messageId');
  const receiverId = searchParams.get('receiverId');

  const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade3.onrender.com';

  // Auto-select conversation from URL parameter
  useEffect(() => {
    if (urlConversationId && conversations.length > 0) {
      const conversation = conversations.find(conv => conv._id === urlConversationId);
      if (conversation && selectedConversation?._id !== conversation._id) {
        console.log('🔄 Selecting conversation from URL:', conversation._id);
        setSelectedConversation(conversation);
        fetchMessages(conversation._id);
        // Hide sidebar on mobile when conversation is selected
        if (window.innerWidth < 768) {
          setShowSidebar(false);
        }
      }
    }
  }, [urlConversationId, conversations]);

  // Handle select conversation
  const handleSelectConversation = (conversation: Conversation) => {
    if (selectedConversation?._id === conversation._id) return;
    
    console.log('🎯 Selecting conversation:', conversation._id);
    navigate(`/chat/${conversation._id}`, { replace: true });
    setSelectedConversation(conversation);
    fetchMessages(conversation._id);
    setShowMoreMenu(false);
    setShowAttachMenu(false);
    // Hide sidebar on mobile
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }, 100);
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`${API_URL}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sorted = response.data.sort(sortConversationsByLatest);
      setConversations(sorted);
      return sorted; 
    } catch (err) {
      console.error('Fetch conversations error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Polling for real-time updates
  const startPolling = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    refreshIntervalRef.current = setInterval(() => {
      if (selectedConversation) {
        checkForNewMessages();
      }
      checkForConversationUpdates();
      fetchNotifications();
    }, 3000);
  };

  const stopPolling = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const checkForNewMessages = async () => {
    if (!selectedConversation) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(
        `${API_URL}/api/conversations/${selectedConversation._id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(response.data)) {
          return response.data;
        }
        return prev;
      });

      markAsRead(selectedConversation._id);
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  };

  const checkForConversationUpdates = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sorted = response.data.sort(sortConversationsByLatest);
      setConversations(sorted);
      if (selectedConversation) {
        const updatedConv = sorted.find((c: Conversation) => c._id === selectedConversation._id);
        if (updatedConv) {
          setSelectedConversation(updatedConv);
        }
      }
    } catch (error) {
      console.error('Error updating conversations:', error);
    }
  };

  const sortConversationsByLatest = (a: Conversation, b: Conversation) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  };

  // Initialize
  useEffect(() => {
    startPolling();
    fetchNotifications();
    return () => {
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [selectedConversation]);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentUserId(response.data._id);
        setCurrentUser(response.data);
      } catch (err) {
        console.error('Fetch user error:', err);
        navigate('/login');
      }
    };
    fetchCurrentUser();
  }, [navigate]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await axios.get(`${API_URL}/api/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const sorted = response.data.sort(sortConversationsByLatest);
        setConversations(sorted);
        setLoading(false);
      } catch (err) {
        console.error('Fetch conversations error:', err);
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  // Create or get conversation
  useEffect(() => {
    const initializeConversation = async () => {
      if (productId && sellerId && currentUserId) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post(
            `${API_URL}/api/conversations/product/${productId}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          handleSelectConversation(response.data.conversation);
          
          setConversations(prev => {
            const exists = prev.find(c => c._id === response.data.conversation._id);
            if (exists) return prev;
            return [response.data.conversation, ...prev].sort(sortConversationsByLatest);
          });
        } catch (err: any) {
          console.error('Initialize conversation error:', err?.response?.data || err);
          toast.error(err.response?.data?.message || 'ไม่สามารถเริ่มการสนทนาได้');
        }
      } else if (messageId && receiverId && currentUserId) {
        try {
          if (receiverId === currentUserId) return;
          const token = localStorage.getItem('token');
          const response = await axios.post(
            `${API_URL}/api/conversations`,
            { messageId, receiverId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          handleSelectConversation(response.data);
          
          setConversations(prev => {
            const exists = prev.find(c => c._id === response.data._id);
            if (exists) return prev;
            return [response.data, ...prev].sort(sortConversationsByLatest);
          });
        } catch (err: any) {
          console.error('Initialize conversation error:', err?.response?.data || err);
          toast.error(err.response?.data?.message || 'ไม่สามารถเริ่มการสนทนาได้');
        }
      }
    };
    if (currentUserId) {
      initializeConversation();
    }
  }, [productId, sellerId, messageId, receiverId, currentUserId]);

  // Fetch messages
  const fetchMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages(response.data);
      markAsRead(conversationId);
    } catch (err) {
      console.error('Fetch messages error:', err);
      toast.error('ไม่สามารถโหลดข้อความได้');
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/api/conversations/${conversationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setConversations(prev => prev.map(conv => 
        conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending || selectedConversation.isCompleted || !selectedConversation.isActive) {
      if (selectedConversation?.isCompleted || !selectedConversation?.isActive) {
        toast.error('การสนทนานี้สิ้นสุดแล้ว');
      }
      return;
    }
    
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/conversations/${selectedConversation._id}/messages`,
        { content: newMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      fetchMessages(selectedConversation._id);
    } catch (err: any) {
      console.error('Send message error:', err);
      toast.error(err.response?.data?.message || 'ไม่สามารถส่งข้อความได้');
    } finally {
      setSending(false);
    }
  };

  // Complete trade
const handleCompleteTrade = async () => {
  if (!selectedConversation || !selectedConversation.product?._id) {
    toast.error('ไม่พบข้อมูลการสนทนาหรือสินค้า');
    return;
  }

  // 🔍 Debug: ตรวจสอบค่าที่ใช้เปรียบเทียบว่าเป็นผู้ขายหรือไม่


  // ✅ ดึงค่า sellerId ให้แน่ใจว่าเป็น string
  const sellerId =
    typeof selectedConversation.product.sellerId === 'object'
      ? selectedConversation.product.sellerId._id
      : selectedConversation.product.sellerId;

  // ✅ เทียบแบบ String ป้องกัน type mismatch
  if (String(sellerId) !== String(currentUserId)) {
    toast.error('เฉพาะผู้ขายเท่านั้นที่สามารถทำเครื่องหมายว่าขายแล้วได้');
    console.warn("❌ Seller mismatch:", { sellerId, currentUserId });
    return;
  }

    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการทำเครื่องหมายว่าสินค้านี้ขายแล้ว?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('กรุณาเข้าสู่ระบบ');
        navigate('/login');
        return;
      }

      console.log('🚀 Attempting to complete trade for conversation:', selectedConversation._id);

      const response = await axios.post(
        `${API_URL}/api/conversations/${selectedConversation._id}/complete-trade`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedConversation: Conversation = response.data.conversation;
      console.log('✅ Complete trade response:', updatedConversation);

      setConversations(prev =>
        prev
          .map(conv =>
            conv._id === selectedConversation._id
              ? updatedConversation
              : conv
          )
          .sort(sortConversationsByLatest)
      );

      setSelectedConversation(prev =>
        prev
          ? {
              ...prev,
              isCompleted: updatedConversation.isCompleted,
              completedAt: updatedConversation.completedAt,
              buyerId: updatedConversation.buyerId,
              isActive: updatedConversation.isActive,
              product: {
                ...prev.product!,
                sold: true,
              },
            }
          : null
      );

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          completedTrades: (currentUser.completedTrades || 0) + 1,
        });
      }

      toast.success('✅ การซื้อขายสำเร็จ!');
      
    } catch (err: any) {
      console.error('❌ Complete trade error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || 'ไม่สามารถสรุปการซื้อขายได้');
    }
  };

  // Submit review
  const handleSubmitReview = async () => {
    if (!selectedConversation || !selectedConversation.product?._id || !reviewRating) {
      toast.error('กรุณาให้คะแนนและเลือกการสนทนา');
      return;
    }

    if (submittingReview) return; 

    setSubmittingReview(true); 

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('กรุณาเข้าสู่ระบบ');
        navigate('/login');
        return;
      }

      const recipientId = selectedConversation.participants.find(
        (p) => p._id !== currentUserId
      )?._id;

      if (!recipientId) {
        toast.error('ไม่พบผู้รับรีวิว');
        return;
      }

      const reviewData = {
        tradeId: selectedConversation._id,
        productId: selectedConversation.product._id,
        recipientId,
        rating: reviewRating,
        comment: reviewComment,
      };

      console.log('Submitting review:', reviewData);
      await axios.post(
        `${API_URL}/api/reviews`,
        reviewData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('✅ ส่งรีวิวสำเร็จ');
      setShowReviewMenu(false);
      setReviewRating(0);
      setReviewComment('');
      fetchNotifications();
    } catch (err: any) {
      console.error('Submit review error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || 'ไม่สามารถส่งรีวิวได้');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Image upload
  const handleImageUpload = async (file: File) => {
    if (!selectedConversation || selectedConversation.isCompleted || !selectedConversation.isActive) {
      toast.error('การสนทนานี้สิ้นสุดแล้ว');
      return;
    }

    try {
      setAttaching(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_URL}/api/conversations/${selectedConversation._id}/attachments`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      
      console.log('Image uploaded:', response.data);
      setShowAttachMenu(false);
      fetchMessages(selectedConversation._id);
    } catch (err: any) {
      console.error('Upload image error:', err);
      toast.error(err.response?.data?.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setAttaching(false);
    }
  };

  // Share location
  const handleShareLocation = async () => {
    if (!selectedConversation || !navigator.geolocation || selectedConversation.isCompleted || !selectedConversation.isActive) {
      toast.error(selectedConversation?.isCompleted || !selectedConversation?.isActive ? 'การสนทนานี้สิ้นสุดแล้ว' : 'อุปกรณ์ไม่รองรับการแชร์ตำแหน่ง');
      return;
    }

    setSharingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true
        });
      });

      const { latitude, longitude } = position.coords;
      
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/conversations/${selectedConversation._id}/messages`,
        { 
          content: `📍 ตำแหน่งของฉัน: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          location: { latitude, longitude }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowAttachMenu(false);
      fetchMessages(selectedConversation._id);
    } catch (error) {
      console.error('Location error:', error);
      toast.error('ไม่สามารถแชร์ตำแหน่งได้');
    } finally {
      setSharingLocation(false);
    }
  };

  // Render message content
  const renderMessageContent = (message: Chat) => {
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];
      if (attachment.fileType.startsWith('image/')) {
        return (
          <div className="max-w-[200px] sm:max-w-xs">
            <img 
              src={attachment.url} 
              alt={attachment.filename}
              className="rounded-lg max-w-full h-auto cursor-pointer"
              onClick={() => window.open(attachment.url, '_blank')}
            />
          </div>
        );
      }
    }

    if (message.location) {
      const { latitude, longitude } = message.location;
      const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      
      return (
        <div className="max-w-[200px] sm:max-w-xs border border-gray-300 rounded-lg overflow-hidden">
          <div 
            className="w-full h-24 sm:h-32 bg-gray-200 flex items-center justify-center cursor-pointer"
            onClick={() => window.open(mapUrl, '_blank')}
          >
            <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
          </div>
          <div className="p-2 bg-white">
            <p className="text-xs sm:text-sm font-medium">ตำแหน่งที่แชร์</p>
            <p className="text-[10px] sm:text-xs text-gray-600">แตะเพื่อเปิดในแผนที่</p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="text-xs sm:text-[13px] whitespace-pre-wrap break-words">
        {message.content}
      </div>
    );
  };

  // Report user or conversation
  const handleReport = async (reason: string) => {
    if (!selectedConversation) return;

    try {
      const token = localStorage.getItem('token');
      const otherUser = getOtherParticipant(selectedConversation);
      
      await axios.post(
        `${API_URL}/api/reports`,
        {
          type: 'CHAT',
          targetId: selectedConversation._id,
          reportedUser: otherUser?._id,
          reason: reason,
          description: `รายงานการสนทนากับ ${otherUser?.name}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('ส่งรายงานเรียบร้อยแล้ว');
      setShowReportMenu(false);
    } catch (err) {
      console.error('Report error:', err);
      toast.error('ไม่สามารถส่งรายงานได้');
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p._id !== currentUserId);
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(response.data.notifications || []);
      setUnreadNotificationCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await axios.patch(`${API_URL}/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, status: 'read', readAt: new Date().toISOString() }
            : notif
        )
      );
      setUnreadNotificationCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark notification as read error:', err);
    }
  };

  // Notification type color
  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  // Notification type icon
  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <X className="h-4 w-4 text-red-600" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <Bell className="h-4 w-4 text-blue-600" />;
    }
  };

  // Render review menu
  const renderReviewMenu = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl w-full max-w-md mx-2 sm:mx-4">
        <div className="border-b border-gray-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold">ให้คะแนนรีวิว</h3>
            <button
              onClick={() => {
                setShowReviewMenu(false);
                setReviewRating(0);
                setReviewComment('');
              }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-600 mb-4">ให้คะแนนการซื้อขาย:</p>
          <div className="flex justify-center gap-1 sm:gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={window.innerWidth < 640 ? 28 : 32}
                className={`cursor-pointer ${star <= reviewRating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
                onClick={() => setReviewRating(star)}
              />
            ))}
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="เขียนความคิดเห็น (ไม่บังคับ)"
            className="w-full p-2 sm:p-3 border border-gray-200 rounded-lg mb-4 resize-none text-sm sm:text-base"
            rows={4}
          />
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <button
              onClick={() => {
                setShowReviewMenu(false);
                setReviewRating(0);
                setReviewComment('');
              }}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg text-sm sm:text-base"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={!reviewRating || submittingReview}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm sm:text-base ${reviewRating && !submittingReview ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              {submittingReview ? 'กำลังส่ง...' : 'ส่งรีวิว'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen md:h-[85vh] lg:h-[80vh] bg-gray-50 max-w-6xl mx-auto border-0 md:border md:border-gray-200 md:rounded-xl overflow-hidden md:mt-4">
      {/* Sidebar - Conversations List */}
      <div className={`${showSidebar || !selectedConversation ? 'block' : 'hidden'} md:block w-full md:w-64 lg:w-72 border-r border-gray-200 bg-white flex flex-col absolute md:relative z-20 h-full md:h-auto`}>
        <div className="border-b border-gray-200 p-2 sm:p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <h1 className="text-lg sm:text-xl font-semibold">ข้อความ</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* แก้ไขส่วนนี้ - กำหนดความสูงและ scroll ที่ชัดเจน */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{
            maxHeight: 'calc(100vh - 80px)',
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db #f3f4f6'
          }}
        >
          <style>
            {`
              .overflow-y-auto::-webkit-scrollbar {
                width: 6px;
              }
              .overflow-y-auto::-webkit-scrollbar-track {
                background: #f3f4f6;
                border-radius: 3px;
              }
              .overflow-y-auto::-webkit-scrollbar-thumb {
                background: #d1d5db;
                border-radius: 3px;
              }
              .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                background: #9ca3af;
              }
            `}
          </style>
          
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
              <User className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-sm text-center">ไม่มีบทสนทนา</p>
              <p className="text-xs text-center mt-1">เริ่มการสนทนาใหม่จากหน้าสินค้า</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherUser = getOtherParticipant(conv);
              const hasUnread = conv.unreadCount !== undefined && conv.unreadCount !== null && conv.unreadCount > 0;
              
              return (
                <button
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-2 sm:p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedConversation?._id === conv._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex gap-2 sm:gap-3">
                    <div className="flex-shrink-0">
                      {otherUser?.profilePicture ? (
                        <img
                          src={otherUser.profilePicture}
                          alt={otherUser.name}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
                        />
                      ) : conv.product?.images?.[0] ? (
                        <img
                          src={conv.product.images[0]}
                          alt={conv.product.title}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span className="font-medium text-xs sm:text-[13px] truncate">
                          {otherUser?.name || 'ไม่ทราบชื่อ'}
                        </span>
                        {hasUnread && (
                          <span className="bg-blue-600 text-white text-[9px] sm:text-[10px] rounded-full px-1 sm:px-1.5 py-0.5 min-w-[16px] sm:min-w-[18px] text-center flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-gray-600 truncate mb-0.5">
                        {conv.product?.title || conv.message?.title || 'การสนทนา'}
                        {conv.isCompleted && <span className="text-red-500 ml-1"> (สิ้นสุด)</span>}
                      </p>
                      {conv.lastMessage && (
                        <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Notifications Panel - Hidden on mobile, shown as modal */}
      {showNotifications && (
        <div className="fixed inset-0 md:relative md:w-80 border-r border-gray-200 bg-white flex flex-col z-30">
          <div className="border-b border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">การแจ้งเตือน</h2>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mb-3" />
                <p className="text-sm sm:text-base">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-2 sm:p-3 rounded-lg border cursor-pointer transition-colors ${
                      notification.status === 'read' 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-white border-gray-300 shadow-sm'
                    } ${getNotificationTypeColor(notification.type)}`}
                    onClick={() => {
                      if (notification.status !== 'read') {
                        markNotificationAsRead(notification._id);
                      }

                      if (
                        notification.title === 'คำขอรีวิวการซื้อขาย' &&
                        notification.conversationId &&
                        notification.productId
                      ) {
                        const relatedConversation = conversations.find(
                          (conv) => conv._id === notification.conversationId
                        );
                        if (relatedConversation) {
                          handleSelectConversation(relatedConversation);
                          setShowReviewMenu(true);
                          setShowNotifications(false);
                        } else {
                          fetchConversations().then(() => {
                            const newConversation = conversations.find(
                              (conv) => conv._id === notification.conversationId
                            );
                            if (newConversation) {
                              handleSelectConversation(newConversation);
                              setShowReviewMenu(true);
                              setShowNotifications(false);
                            } else {
                              toast.error('ไม่พบการสนทนาที่เกี่ยวข้อง');
                            }
                          });
                        }
                      }
                    }}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm mb-1">
                          {notification.title}
                        </h4>
                        <p className="text-[10px] sm:text-xs opacity-90 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs opacity-75">
                          <span>
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: th
                            })}
                          </span>
                          {notification.status !== 'read' && (
                            <span className="bg-blue-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs">
                              ใหม่
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className={`${!showSidebar || selectedConversation ? 'flex' : 'hidden'} md:flex flex-1 flex-col absolute md:relative w-full h-full md:h-auto z-10`}>
        {selectedConversation ? (
          <>
            <div className="border-b border-gray-200 bg-white p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {/* Mobile back button */}
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  
                  {(() => {
                    const otherUser = getOtherParticipant(selectedConversation);
                    return (
                      <>
                        <div className="relative flex-shrink-0">
                          {otherUser?.profilePicture ? (
                            <img
                              src={otherUser.profilePicture}
                              alt={otherUser.name}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover cursor-pointer"
                              onClick={() => navigate(`/profile/${otherUser._id}`)}
                            />
                          ) : selectedConversation.product?.images?.[0] ? (
                            <img
                              src={selectedConversation.product.images[0]}
                              alt={selectedConversation.product.title}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover cursor-pointer"
                              onClick={() => {
                                if (selectedConversation.product?._id) {
                                  navigate(`/product/${selectedConversation.product._id}`);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center cursor-pointer"
                              onClick={() => otherUser && navigate(`/profile/${otherUser._id}`)}>
                              <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                                                          </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-semibold text-sm sm:text-[15px] truncate">
                            {otherUser?.name || 'ไม่ทราบชื่อ'}
                          </h2>
                          <p className="text-[11px] sm:text-[12px] text-gray-600 truncate">
                            {selectedConversation.product?.title || 'การสนทนา'}
                            {selectedConversation.product?.sold && (
                              <span className="text-red-500 ml-1"> (ขายแล้ว)</span>
                            )}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button
                        className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => {
                          const other = getOtherParticipant(selectedConversation);
                          if (other?._id) navigate(`/profile/${other._id}`);
                          setShowMoreMenu(false);
                        }}
                      >
                        <User className="h-3 w-3 sm:h-4 sm:w-4" />
                        ดูโปรไฟล์
                      </button>
                      {selectedConversation.product?._id && (
                        <button
                          className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            navigate(`/product/${selectedConversation.product?._id}`);
                            setShowMoreMenu(false);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                          ดูสินค้านี้
                        </button>
                      )}
                      {selectedConversation.product && !selectedConversation.isCompleted && (
                        <button
                          className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                          onClick={() => {
                            handleCompleteTrade();
                            setShowMoreMenu(false);
                          }}
                        >
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          ทำเครื่องหมายว่าขายแล้ว
                        </button>
                      )}
                      <button
                        className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                        onClick={() => {
                          setShowReportMenu(true);
                          setShowMoreMenu(false);
                        }}
                      >
                        <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                        รายงาน
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3 bg-gray-50">
              {selectedConversation.isCompleted && (
                <div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 pt-0.5">
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-900 mb-1 text-xs sm:text-sm">
                        การซื้อขายสิ้นสุดแล้ว
                      </h4>
                      <p className="text-[10px] sm:text-xs text-red-800">
                        การสนทนานี้เกี่ยวกับ "{selectedConversation.product?.title}" ได้สิ้นสุดลงแล้ว
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <p className="text-sm sm:text-base">เริ่มต้นการสนทนา</p>
                  <p className="text-xs sm:text-sm mt-2">ส่งข้อความเพื่อเริ่มการสนทนา</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isCurrentUser = message.sender._id === currentUserId;
                  const hasAttachment = message.attachments && message.attachments.length > 0;
                  const hasLocation = message.location;
                  return (
                    <div
                      key={message._id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 ${
                          isCurrentUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        {!isCurrentUser && !hasAttachment && !hasLocation && (
                          <p className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 text-gray-600">
                            {message.sender.name}
                          </p>
                        )}
                        {renderMessageContent(message)}
                        <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                          <p className={`text-[10px] sm:text-[11px] ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                            {formatDistanceToNow(new Date(message.createdAt), {
                              addSuffix: true,
                              locale: th
                            })}
                          </p>
                          {isCurrentUser && (
                            <span className={`text-[9px] sm:text-[10px] ml-2 ${message.read ? 'text-green-300' : 'text-blue-200'}`}>
                              {message.read ? 'อ่านแล้ว' : 'ส่งแล้ว'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 bg-white p-2 sm:p-3">
              {selectedConversation.isCompleted && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3 mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 flex-shrink-0" />
                    <p className="text-[10px] sm:text-xs text-yellow-800">
                      การสนทนานี้สิ้นสุดแล้ว - ไม่สามารถส่งข้อความได้
                    </p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 sm:gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={selectedConversation?.isCompleted || !selectedConversation?.isActive}
                    className={`p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors mb-0.5 sm:mb-1 ${
                      selectedConversation?.isCompleted || !selectedConversation?.isActive ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  </button>
                  {showAttachMenu && !selectedConversation?.isCompleted && selectedConversation?.isActive && (
                    <div className="absolute bottom-10 sm:bottom-12 left-0 w-44 sm:w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={attaching}
                        className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Image className="h-3 w-3 sm:h-4 sm:w-4" />
                        {attaching ? 'กำลังอัพโหลด...' : 'อัพโหลดรูปภาพ'}
                      </button>
                      <button
                        type="button"
                        disabled={sharingLocation}
                        onClick={handleShareLocation}
                        className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                        {sharingLocation ? 'กำลังแชร์ตำแหน่ง...' : 'แชร์ตำแหน่ง'}
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleImageUpload(file);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="hidden"
                />
                
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={selectedConversation?.isCompleted || !selectedConversation?.isActive ? "การสนทนานี้สิ้นสุดแล้ว" : "พิมพ์ข้อความ..."}
                    disabled={selectedConversation?.isCompleted || !selectedConversation?.isActive}
                    className={`w-full px-2.5 sm:px-3 py-2 sm:py-2.5 border border-gray-300 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-xs sm:text-[14px] ${
                      selectedConversation?.isCompleted || !selectedConversation?.isActive ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!selectedConversation?.isCompleted && selectedConversation?.isActive) {
                          handleSendMessage(e);
                        }
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending || selectedConversation?.isCompleted || !selectedConversation?.isActive}
                  className="p-2 sm:p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-0.5 sm:mb-1 flex-shrink-0"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
            <div className="text-center">
              <User className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-base sm:text-lg mb-2">เลือกการสนทนาเพื่อเริ่มแชท</p>
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                เลือกการสนทนา
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Menu */}
      {showReviewMenu && renderReviewMenu()}

      {/* Report Menu */}
      {showReportMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-md mx-2 sm:mx-4">
            <div className="border-b border-gray-200 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold">รายงานการสนทนา</h3>
                <button
                  onClick={() => setShowReportMenu(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <p className="text-sm sm:text-base text-gray-600 mb-4">เลือกเหตุผลในการรายงาน:</p>
              <div className="space-y-2">
                {[
                  'ข้อความไม่เหมาะสม',
                  'การกลั่นแกล้งหรือข่มขู่',
                  'สแปม',
                  'ข้อมูลปลอม',
                  'อื่นๆ'
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => handleReport(reason)}
                    className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-md mx-2 sm:mx-4">
            <div className="border-b border-gray-200 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold">เริ่มการสนทนาใหม่</h3>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 text-center">
              <User className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                เริ่มการสนทนาจากหน้าสินค้าหรือโพสต์โดยกดปุ่ม "แชทกับผู้ขาย"
              </p>
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  navigate('/');
                }}
                className="bg-blue-600 text-white px-5 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                ไปหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;