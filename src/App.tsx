import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./App.css";

//layout
import Header from "./layouts/Header";
import Footer from "./layouts/Footer";

import ScrollToTop from "./components/ScrollToTop";

//pages
import Browse from "./pages/Browse";
import Dashboard from "./pages/Dashboard";
import Contact from "./pages/Contact";
import Settings from "./pages/settings";
import ProductDetail from "./pages/ProductDetail";
import MessageEdit from "./pages/MessageEdit";
import Search from "./pages/Search";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import MessageDetail from "./pages/MessagesDetail";
import Chat from "./pages/chat";
import ProfileLook from "./pages/ProfileLook";
import Listings from "./pages/Listings";
import Messages from "./pages/Messages";

//Admin Page
import AdminDashboard from "./pages/Admin/Dashborad";
import Users from "./pages/Admin/Users";
import AdminProducts from "./pages/Admin/Products";
import Reports from "./pages/Admin/Reports";
import MessageCenter from "./pages/Admin/MessageCenter";
import MessagesAdmin from "./pages/Admin/Messages";

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const hideLayout =
    ["/login", "/register"].includes(location.pathname.toLowerCase()) ||
    location.pathname.toLowerCase().startsWith("/admin");

  return (
    <>
      {!hideLayout && <Header />}
      {children}
      {!hideLayout && <Footer />}
    </>
  );
}

function App() {
  // Hard-code Client ID โดยตรง
  const GOOGLE_CLIENT_ID =
    "827608649659-eboahljgg7cgccsrvuhtno8k979ar3k2.apps.googleusercontent.com";

  // Debug: ตรวจสอบว่า Client ID โหลดหรือไม่
  console.log("=== Google OAuth Debug ===");
  console.log("Client ID:", GOOGLE_CLIENT_ID);
  console.log("Is Loaded:", !!GOOGLE_CLIENT_ID);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || ""}>
      <BrowserRouter>
        <ScrollToTop />
        <LayoutWrapper>
          <Routes>
            <Route path="/" element={<Browse />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/message/edit/:id" element={<MessageEdit />} />
            <Route path="/settings" element={<Settings />} />{" "}
            {/* เพิ่ม route นี้ */}
            <Route path="/message/:id" element={<MessageDetail />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="/search" element={<Search />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<ProfileLook />} />
            <Route path="/profile-look/:id" element={<ProfileLook />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/messages" element={<Messages />} />
            {/* Admin Page */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/messages" element={<MessageCenter />} />
            <Route path="/admin/MessagesAdmin" element={<MessagesAdmin />} />
          </Routes>
        </LayoutWrapper>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
