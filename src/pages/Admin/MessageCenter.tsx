import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  FaSearch,
  FaUser,
  FaEnvelope,
  FaTrash,
  FaCircle,
  FaWifi,
  FaPaperPlane,
  FaSync,
  FaArrowLeft,
} from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";

// Interfaces (ไม่เปลี่ยนแปลง)
interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage: {
    content: string;
    sender: User;
    createdAt: string;
  };
  isAdminChat: boolean;
  userId: string;
  adminId: string;
  unreadCount: Map<string, number>;
  createdAt: string;
  updatedAt: string;
  userInfo?: User;
}

interface Message {
  _id: string;
  sender: User;
  content: string;
  createdAt: string;
  isAdminMessage: boolean;
  messageType?: string;
  attachments?: {
    url: string;
    filename: string;
    fileType: string;
    fileSize: number;
  }[];
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

// Custom Hook (ไม่เปลี่ยนแปลง)
const useConversationStream = (
  conversationId: string | null,
  token: string | null
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!conversationId || !token) {
      setIsConnected(false);
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const API_URL =
      import.meta.env.VITE_API_URL || "https://unitrade5.onrender.com";
    const url = new URL(
      `${API_URL}/api/conversations/${conversationId}/stream`
    );
    url.searchParams.set("token", token);

    try {
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("✅ Connected to real-time chat");
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          if (event.data === ": heartbeat" || event.data === ": ping") {
            return;
          }
          const data = JSON.parse(event.data);
          if (data.type === "connected") {
            return;
          }
          if (data._id && data.content && data.sender) {
            setMessages((prev) => {
              if (prev.some((msg) => msg._id === data._id)) {
                return prev;
              }
              return [...prev, data];
            });
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        setIsConnected(false);
      };
    } catch (err) {
      console.error("Failed to create EventSource:", err);
      setIsConnected(false);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [conversationId, token]);

  const addMessage = (message: Message) => {
    setMessages((prev) => {
      if (prev.some((msg) => msg._id === message._id)) {
        return prev;
      }
      return [...prev, message];
    });
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    setMessages,
    addMessage,
    clearMessages,
    isConnected,
  };
};

export default function AdminMessageCenter() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [streamToken, setStreamToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL =
    import.meta.env.VITE_API_URL || "https://unitrade5.onrender.com";
  const token = localStorage.getItem("adminToken");

  const { messages, setMessages, addMessage, clearMessages, isConnected } =
    useConversationStream(selectedConversation?._id || null, streamToken);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Functions (ไม่เปลี่ยนแปลง)
  const showToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const fetchConversations = async () => {
    try {
      try {
        const res = await axios.get(
          `${API_URL}/api/conversations/admin/conversations`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setConversations(res.data);
      } catch (adminErr) {
        console.log("Using fallback endpoint");
        const res = await axios.get(`${API_URL}/api/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const adminConversations = res.data.filter(
          (conv: Conversation) => conv.isAdminChat
        );
        setConversations(adminConversations);
      }
    } catch (err: any) {
      console.error("Fetch conversations error:", err);
      showToast("ไม่สามารถโหลดรายการการสนทนาได้", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessagesAndToken = async (conversationId: string) => {
    try {
      const messagesRes = await axios.get(
        `${API_URL}/api/conversations/${conversationId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(messagesRes.data);
      try {
        const tokenRes = await axios.get(
          `${API_URL}/api/conversations/${conversationId}/token`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setStreamToken(tokenRes.data.token);
      } catch (tokenErr) {
        console.log("Token endpoint not available, using basic token");
        setStreamToken(token);
      }
    } catch (err: any) {
      console.error("Fetch messages/token error:", err);
      showToast("ไม่สามารถโหลดข้อความได้", "error");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    setSending(true);
    try {
      let res;
      try {
        res = await axios.post(
          `${API_URL}/api/conversations/${selectedConversation._id}/admin-messages`,
          { content: newMessage },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (adminMsgErr) {
        res = await axios.post(
          `${API_URL}/api/conversations/${selectedConversation._id}/messages`,
          { content: newMessage },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      addMessage(res.data);
      setNewMessage("");
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === selectedConversation._id
            ? {
                ...conv,
                lastMessage: {
                  content: newMessage,
                  sender: res.data.sender,
                  createdAt: new Date().toISOString(),
                },
              }
            : conv
        )
      );
    } catch (err: any) {
      console.error("Send message error:", err);
      showToast("ส่งข้อความไม่สำเร็จ", "error");
    } finally {
      setSending(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบการสนทนานี้?")) return;
    try {
      await axios.delete(`${API_URL}/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations((prev) =>
        prev.filter((conv) => conv._id !== conversationId)
      );
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        clearMessages();
        setStreamToken(null);
      }
      showToast("ลบการสนทนาสำเร็จ", "success");
    } catch (err: any) {
      console.error("Delete conversation error:", err);
      showToast("ลบการสนทนาไม่สำเร็จ", "error");
    }
  };

  const getOtherUser = (conversation: Conversation): User | null => {
    if (conversation.userInfo) {
      return conversation.userInfo;
    }
    const user = conversation.participants.find(
      (p) => !p.role || p.role !== "admin"
    );
    if (!user && conversation.userId) {
      return (
        conversation.participants.find((p) => p._id === conversation.userId) ||
        null
      );
    }
    return user || conversation.participants[0] || null;
  };

  const filteredConversations = conversations.filter((conv) => {
    const user = getOtherUser(conv);
    return (
      user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) {
      return date.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "เมื่อวาน";
    } else if (days < 7) {
      return `${days} วันที่แล้ว`;
    } else {
      return date.toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
      });
    }
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    clearMessages();
    setStreamToken(null);
    fetchMessagesAndToken(conversation._id);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchConversations();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <AdminLayout>
      {/* Main Container - Responsive Height */}
      <div className="flex bg-white h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] lg:h-full">
        {/* Sidebar - Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full ${
            selectedConversation ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="p-3 md:p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                ศูนย์ข้อความ
              </h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  className="p-1.5 md:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="รีเฟรช"
                >
                  <FaSync
                    className={`${
                      loading ? "animate-spin" : ""
                    } text-sm md:text-base`}
                  />
                </button>
                <div className="flex items-center space-x-1.5 md:space-x-2 text-xs md:text-sm">
                  <FaWifi
                    className={`${
                      isConnected ? "text-green-500" : "text-gray-400"
                    } text-xs md:text-sm`}
                  />
                  <span
                    className={`hidden sm:inline ${
                      isConnected ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {isConnected ? "ออนไลน์" : "ออฟไลน์"}
                  </span>
                </div>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-2.5 md:top-3 text-gray-400 text-xs md:text-sm" />
              <input
                type="text"
                placeholder="ค้นหาผู้ใช้..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-4 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 px-4">
                <FaEnvelope className="mx-auto text-3xl md:text-4xl mb-2 text-gray-300" />
                <p className="text-sm md:text-base">ไม่มีการสนทนา</p>
                {searchTerm && (
                  <p className="text-xs md:text-sm mt-1">
                    ไม่พบผลลัพธ์สำหรับ "{searchTerm}"
                  </p>
                )}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const user = getOtherUser(conversation);
                const isSelected =
                  selectedConversation?._id === conversation._id;

                return (
                  <div
                    key={conversation._id}
                    className={`p-3 md:p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? "bg-blue-50 border-blue-200" : ""
                    }`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <FaUser className="text-blue-600 text-xs md:text-sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-800 truncate text-sm md:text-base">
                            {user?.name || "ไม่ระบุชื่อ"}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-500 truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation._id);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2 p-1"
                        title="ลบการสนทนา"
                      >
                        <FaTrash size={12} className="md:w-3.5 md:h-3.5" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-xs md:text-sm text-gray-600 truncate flex-1 mr-2">
                        {conversation.lastMessage.content}
                      </p>
                      <span className="text-[10px] md:text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {formatDate(conversation.lastMessage.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Content - Chat Area */}
        <div
          className={`flex-1 flex flex-col w-full h-full ${
            selectedConversation ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-3 md:p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-1.5 -ml-1 text-gray-600 hover:bg-gray-100 rounded-full flex-shrink-0"
                      aria-label="กลับไปรายการแชท"
                    >
                      <FaArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaUser className="text-green-600 text-xs md:text-sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-gray-800 truncate text-sm md:text-base">
                        {getOtherUser(selectedConversation)?.name ||
                          "ไม่ระบุชื่อ"}
                      </h2>
                      <p className="text-xs md:text-sm text-gray-500 truncate">
                        {getOtherUser(selectedConversation)?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 md:space-x-2 text-xs md:text-sm text-gray-500 flex-shrink-0">
                    <FaCircle
                      className={`${
                        isConnected ? "text-green-500" : "text-gray-400"
                      } text-[6px] md:text-[8px]`}
                    />
                    <span className="hidden sm:inline">
                      {isConnected ? "ออนไลน์" : "กำลังเชื่อมต่อ..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-white">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FaEnvelope className="mx-auto text-3xl md:text-4xl mb-2 text-gray-300" />
                    <p className="text-sm md:text-base">ยังไม่มีข้อความ</p>
                    <p className="text-xs md:text-sm text-gray-400 mt-1">
                      เริ่มการสนทนาด้วยการส่งข้อความแรก
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {messages.map((message) => {
                      const isAdmin = message.isAdminMessage;
                      const hasImage =
                        message.attachments &&
                        message.attachments.some((att) =>
                          att.fileType.startsWith("image/")
                        );
                      const imageAttachment = hasImage
                        ? message.attachments![0]
                        : null;

                      if (hasImage && imageAttachment) {
                        return (
                          <div
                            key={message._id}
                            className={`flex ${
                              isAdmin ? "justify-end" : "justify-start"
                            } mb-3`}
                          >
                            <div className="max-w-[85%] sm:max-w-xs lg:max-w-md">
                              <div className="relative">
                                <img
                                  src={imageAttachment.url}
                                  alt="Attached image"
                                  className="max-w-full h-auto rounded-xl cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
                                  onClick={() =>
                                    window.open(imageAttachment.url, "_blank")
                                  }
                                />
                              </div>

                              {message.content &&
                                message.content !== "ส่งรูปภาพ" &&
                                message.content !== "ส่งไฟล์" && (
                                  <div
                                    className={`mt-2 px-3 py-2 rounded-lg max-w-full ${
                                      isAdmin
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    <p className="text-xs md:text-sm whitespace-pre-wrap break-words">
                                      {message.content}
                                    </p>
                                  </div>
                                )}

                              <div
                                className={`text-[10px] md:text-xs mt-1 px-1 ${
                                  isAdmin
                                    ? "text-blue-600 text-right"
                                    : "text-gray-500"
                                }`}
                              >
                                {formatMessageTime(message.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={message._id}
                          className={`flex ${
                            isAdmin ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 md:px-4 py-2 rounded-2xl ${
                              isAdmin
                                ? "bg-blue-500 text-white rounded-br-none"
                                : "bg-gray-100 text-gray-800 rounded-bl-none"
                            }`}
                          >
                            <p className="text-xs md:text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <div
                              className={`text-[10px] md:text-xs mt-1 ${
                                isAdmin ? "text-blue-100" : "text-gray-500"
                              }`}
                            >
                              {formatMessageTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-3 md:p-4 flex-shrink-0">
                <div className="flex space-x-2 md:space-x-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="พิมพ์ข้อความ..."
                      className="w-full border border-gray-300 rounded-lg px-3 md:px-4 py-2 text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 md:pr-12"
                      disabled={sending || !isConnected}
                    />
                    {newMessage && (
                      <button
                        onClick={() => setNewMessage("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm md:text-base"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending || !isConnected}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 md:px-6 py-2 rounded-lg transition-colors font-medium flex items-center space-x-1.5 md:space-x-2 flex-shrink-0"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white"></div>
                    ) : (
                      <FaPaperPlane size={12} className="md:w-3.5 md:h-3.5" />
                    )}
                    <span className="text-xs md:text-sm">
                      {sending ? "กำลังส่ง..." : "ส่ง"}
                    </span>
                  </button>
                </div>
                {!isConnected && (
                  <p className="text-[10px] md:text-xs text-orange-600 mt-2 flex items-center space-x-1">
                    <FaCircle className="text-orange-500 text-[6px] md:text-[8px]" />
                    <span>กำลังเชื่อมต่อระบบเรียลไทม์...</span>
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center bg-white p-4">
              <div className="text-center max-w-md">
                <FaEnvelope className="mx-auto text-4xl md:text-6xl text-gray-300 mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-gray-600 mb-2">
                  เลือกการสนทนา
                </h3>
                <p className="text-sm md:text-base text-gray-500">
                  เลือกการสนทนาจากรายการด้านข้างเพื่อเริ่มการสนทนากับผู้ใช้
                </p>
                {conversations.length === 0 && !loading && (
                  <p className="text-xs md:text-sm text-gray-400 mt-2">
                    ยังไม่มีการสนทนาใดๆ เมื่อมีผู้ใช้ส่งข้อความถึงผู้ดูแลระบบ
                    การสนทนาจะปรากฏที่นี่
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications - Responsive */}
      <div className="fixed bottom-2 md:bottom-4 right-2 md:right-4 left-2 md:left-auto flex flex-col gap-2 z-50 max-w-md">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 md:px-6 py-2.5 md:py-3 rounded-lg shadow-lg text-white font-medium transform transition-all duration-300 ${
              toast.type === "success"
                ? "bg-green-500 hover:bg-green-600"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm md:text-base">{toast.message}</span>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="ml-3 md:ml-4 text-white hover:text-gray-200 text-lg md:text-xl flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
