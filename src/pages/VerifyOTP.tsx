import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AiOutlineClose, AiOutlineMail } from "react-icons/ai";
import "./style/Loginstyle.css";

const VerifyOTP = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const email = location.state?.email || localStorage.getItem('pendingVerification');

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }

    // Timer countdown
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [email, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = pastedData.split('');
    
    while (newOtp.length < 6) {
      newOtp.push('');
    }
    
    setOtp(newOtp);
    
    // Focus last filled input
    const lastFilledIndex = Math.min(pastedData.length - 1, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setError("");
    setIsLoading(true);
    setLoadingMessage("Verifying OTP...");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade2.onrender.com";
      
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await res.json();

      if (res.ok) {
        setLoadingMessage("Verification successful! Redirecting...");
        
        // Save token and user data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.removeItem('pendingVerification');
        
        setTimeout(() => {
          if (data.user.role?.toLowerCase() === "admin") {
            localStorage.setItem("adminToken", data.token);
            navigate("/admin");
          } else {
            navigate("/browse");
          }
        }, 1000);
      } else {
        if (data.expired) {
          setError("OTP has expired. Please request a new one.");
        } else {
          setError(data.message || "Invalid OTP. Please try again.");
        }
        
        // Reset OTP inputs on error
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("Unable to connect to the server. Please check your internet connection.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setIsLoading(true);
    setLoadingMessage("Sending new OTP...");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade2.onrender.com";
      
      const res = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setLoadingMessage("");
        setTimer(600); // Reset timer
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        alert("✅ New OTP has been sent to your email!");
      } else {
        setError(data.message || "Failed to resend OTP. Please try again.");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="login-container">
      <button 
        onClick={() => navigate("/register")}
        className="login-close-btn"
        aria-label="Close"
      >
        <AiOutlineClose className="login-close-icon" />
      </button>

      {/* Left Side */}
      <div className="login-left-side">
        <h1 className="login-welcome-text">Verify Your Email</h1>
        
        <div className="login-title-container">
          <h1 className="login-title">UniTrade</h1>
          <h2 className="login-subtitle">Campus Marketplace</h2>
        </div>
        
        <div className="login-description-box">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <p className="login-description">
            เราได้ส่งรหัส OTP 6 หลักไปยังอีเมล <strong>{email}</strong>
            <br /><br />
            กรุณาตรวจสอบอีเมลของคุณและกรอกรหัส OTP เพื่อยืนยันบัญชี
          </p>
        </div>

        <div className="login-stats-container">
          <div className="login-stat-box">
            <div className="login-stat-icon">⏱️</div>
            <div className="login-stat-number">{formatTime(timer)}</div>
            <div className="login-stat-label">Time Remaining</div>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="login-right-side">
        <div className="login-form-container">
          <div className="login-form-header">
            <AiOutlineMail size={48} style={{ color: '#667eea', marginBottom: '1rem' }} />
            <h1 className="login-form-title">Enter OTP Code</h1>
            <p className="login-form-subtitle">
              Please enter the 6-digit code sent to your email
            </p>
          </div>

          {error && (
            <div className="login-error">
              <svg className="login-error-icon" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {/* OTP Input */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el: any) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={isLoading}
                  className="otp-input"
                  style={{
                    width: '3rem',
                    height: '3.5rem',
                    fontSize: '1.5rem',
                    textAlign: 'center',
                    border: '2px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontWeight: 'bold'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.join('').length !== 6}
              className="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <svg className="login-spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                  {loadingMessage || 'Verifying...'}
                </>
              ) : (
                "Verify OTP"
              )}
            </button>
          </form>

          <div className="login-divider" style={{ margin: '1.5rem 0' }}>
            <div className="login-divider-line"></div>
            <span className="login-divider-text">Didn't receive the code?</span>
            <div className="login-divider-line"></div>
          </div>

          <button
            onClick={handleResendOTP}
            disabled={!canResend || isLoading}
            className="login-social-btn"
            style={{
              width: '100%',
              opacity: canResend && !isLoading ? 1 : 0.5,
              cursor: canResend && !isLoading ? 'pointer' : 'not-allowed'
            }}
          >
            {canResend ? (
              '🔄 Resend OTP'
            ) : (
              `Resend available in ${formatTime(timer)}`
            )}
          </button>

          <div className="login-register-link" style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#6c757d' }}>
              Wrong email?{" "}
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  localStorage.removeItem('pendingVerification');
                  navigate('/register');
                }}
                style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}
              >
                Change email
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;