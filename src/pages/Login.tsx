import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useMediaQuery } from "react-responsive"; // ต้อง npm install react-responsive

import { jwtDecode } from "jwt-decode";
import {
  AiOutlineClose,
  AiOutlineEye,
  AiOutlineEyeInvisible,
} from "react-icons/ai";
import "./style/Loginstyle.css";

interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
  sub: string;
  given_name?: string;
  family_name?: string;
}

const Login = () => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
const [loadingMessage, setLoadingMessage] = useState('');
const isDesktop = useMediaQuery({ minWidth: 768 });


  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [productCount, setProductCount] = useState<number>(0);

  useEffect(() => {
    const savedLogin = localStorage.getItem("rememberedLogin");
    const savedRemember = localStorage.getItem("rememberMe") === "true";

    if (savedRemember && savedLogin) {
      setLogin(savedLogin);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
        const [userRes, productRes] = await Promise.all([
          fetch(`${API_URL}/api/users/count`),
          fetch(`${API_URL}/api/products/count`),
        ]);

        if (userRes.ok) {
          const userData = await userRes.json();
          setActiveUsers(userData.count || 0);
        }
        if (productRes.ok) {
          const productData = await productRes.json();
          setProductCount(productData.count || 0);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
        setActiveUsers(0);
        setProductCount(0);
      }
    };

    fetchStats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setLoadingMessage('Signing in...');
  
    if (!login.trim() || !password.trim()) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }
  
    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
      setLoadingMessage('Connecting to server...');
      
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
  
      const data = await res.json();
  
      if (res.ok) {
        setLoadingMessage('Login successful! Redirecting...');
        
        if (remember) {
          localStorage.setItem("rememberedLogin", login);
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberedLogin");
          localStorage.removeItem("rememberMe");
        }
        
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        if (data.user.role?.toLowerCase() === "admin") {
          localStorage.setItem("adminToken", data.token);
          setTimeout(() => navigate("/admin"), 500);
        } else {
          setTimeout(() => navigate("/browse"), 500);
        }
      } else {
        // ✅ แสดง error message ที่ชัดเจนขึ้น
        if (data.isGoogleAccount) {
          setError("This account uses Google Sign-In. Please use the 'Sign in with Google' button below.");
        } else if (data.field === 'account') {
          setError(data.message || "Your account has been suspended.");
        } else {
          setError(data.message || "Login failed. Please check your credentials and try again.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Unable to connect to the server. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    console.log("Google Response received");
    setIsLoading(true);
    setLoadingMessage('Verifying Google account...');
    setError("");
  
    try {
      if (!credentialResponse.credential) {
        setError("Google login failed. Please try again.");
        setIsLoading(false);
        return;
      }
  
      const decoded = jwtDecode<GoogleUserInfo>(credentialResponse.credential);
      console.log("Google User Info:", decoded.email);
  
      setLoadingMessage('Authenticating with server...');
      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
      
      const res = await fetch(`${API_URL}/api/auth/google-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: credentialResponse.credential
        }),
      });
  
      const data = await res.json();
  
      if (res.ok) {
        setLoadingMessage('Login successful! Redirecting...');
        
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        if (data.user.role?.toLowerCase() === "admin") {
          localStorage.setItem("adminToken", data.token);
          setTimeout(() => navigate("/admin"), 500);
        } else {
          setTimeout(() => navigate("/browse"), 500);
        }
      } else {
        // ✅ แสดง error message ที่ชัดเจน
        if (data.field === 'account') {
          setError(data.message || "Your account has been suspended.");
        } else if (data.field === 'google') {
          setError("Google authentication failed. Please try again or use email/password login.");
        } else {
          setError(data.message || "Google login failed. Please try again.");
        }
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      setError("Unable to connect to the server. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGoogleError = () => {
    // eslint-disable-next-line no-console
    console.log("Google Login Failed");
    setError("Google login failed. Please try again.");
  };

  return (
    <div className="login-container">
    {/* Close button */}
    <button onClick={() => navigate("/browse")} className="login-close-btn">
      <AiOutlineClose className="login-close-icon" />
    </button>

    {/* แสดง Left Side เฉพาะ Desktop */}
    {isDesktop && (
      <div className="login-left-side">
        <h1 className="login-welcome-text">Welcome to</h1>

        <div className="login-title-container">
          <h1 className="login-title">UniTrade</h1>
          <h2 className="login-subtitle">Campus Marketplace</h2>
        </div>

        <div className="login-stats-container">
          <div className="login-stat-box">
            <div className="login-stat-number">{activeUsers}</div>
            <div className="login-stat-label">Active Users</div>
          </div>
          <div className="login-stat-box">
            <div className="login-stat-number">{productCount}</div>
            <div className="login-stat-label">Products</div>
          </div>
        </div>

        <div className="login-description-box">
          <p className="login-description">
            แพลตฟอร์มแลกเปลี่ยน ซื้อ-ขาย ของมือสองในรั้วมหาวิทยาลัย
            เชื่อมต่อนักศึกษาทุกคนเข้าด้วยกันอย่างปลอดภัยและง่ายดาย
          </p>
        </div>
      </div>
    )}

    {/* ลบส่วนนี้ออก - ซ้ำกับด้านบน */}
    {/* <div className="login-left-side">...</div> */}

    {/* Right Side - Form Login */}
    <div className="login-right-side">
      <div className="login-form-container">
        <div className="login-form-header">
          <h1 className="login-form-title">Welcome Back</h1>
          <p className="login-form-subtitle">
            Sign in to your UniTrade account
          </p>
        </div>

        {error && (
          <div className="login-error">
            <svg className="login-error-icon" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label className="login-label">Email or Student ID</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Enter your email or student ID"
              className="login-input"
              required
              disabled={isLoading}
            />
          </div>

          <div className="login-form-group">
            <label className="login-label">Password</label>
            <div className="login-password-container">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="login-input"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-password-toggle"
                disabled={isLoading}
              >
                {showPassword ? (
                  <AiOutlineEyeInvisible size={20} />
                ) : (
                  <AiOutlineEye size={20} />
                )}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="login-checkbox"
                disabled={isLoading}
              />
              <span className="login-remember-label">Remember me</span>
            </label>

            <Link to="/forgot-password" className="login-forgot">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="login-submit-btn"
          >
            {isLoading ? (
              <>
                <svg className="login-spinner" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                </svg>
                {loadingMessage || 'Signing in...'}
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <div className="login-divider">
          <div className="login-divider-line"></div>
          <span className="login-divider-text">Or continue with</span>
          <div className="login-divider-line"></div>
        </div>

        <div className="flex justify-center items-center mt-4 mb-2">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            ux_mode="popup"
            theme="outline"
            size="large"
            text="signin_with"
            shape="rectangular"
            width="280"
          />
        </div>

        <div className="login-register-link">
          <p>
            Don't have an account? <Link to="/register">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  </div>
);
};

export default Login;