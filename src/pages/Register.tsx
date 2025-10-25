import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineClose, AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { IoCheckmarkCircle, IoAlertCircle, IoShieldCheckmark } from "react-icons/io5";
import "./style/Loginstyle.css"; 

const Register = () => {
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [mainLoading, setMainLoading] = useState(false);
  const [mainError, setMainError] = useState("");
  const [mainSuccess, setMainSuccess] = useState("");
  
  const [passwordStrength, setPasswordStrength] = useState({
    hasLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false
  });
  const navigate = useNavigate();

  // State สำหรับ Email / OTP
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // State สำหรับ Resend OTP
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);

  // Effect สำหรับนับเวลาถอยหลัง
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const startResendTimer = () => {
    setResendTimer(60); 
  };

  const checkPasswordStrength = (pwd) => {
    setPasswordStrength({
      hasLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd)
    });
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    checkPasswordStrength(pwd);
  };

  // 1. กดปุ่ม "Send OTP" (ปุ่มเล็ก)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError("");
    setOtpSuccess("");
    const lowerEmail = email.toLowerCase().trim();

    if (!lowerEmail.endsWith('@kkumail.com')) {
      setOtpError("โปรดใช้อีเมลของมหาวิทยาลัย (@kkumail.com)");
      setOtpLoading(false);
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
      const res = await fetch(`${API_URL}/api/auth/send-register-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lowerEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSuccess("OTP has been sent to your email.");
        setIsOtpSent(true); 
        startResendTimer();
      } else {
        setOtpError(data.message || "Failed to send OTP.");
      }
    } catch (error) {
      setOtpError("Unable to connect to server.");
    } finally {
      setOtpLoading(false);
    }
  };

  // 2. กดปุ่ม "Verify" (ปุ่มเล็กอันที่สอง)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError("");
    setOtpSuccess("");

    if (!otp || otp.length < 6) {
        setOtpError("Please enter a valid 6-digit OTP.");
        setOtpLoading(false);
        return;
    }

    try {
        const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
        const res = await fetch(`${API_URL}/api/auth/verify-register-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.toLowerCase().trim(), otp }),
        });
        const data = await res.json();
        if (res.ok) {
            setOtpSuccess("Email verified successfully!");
            setIsEmailVerified(true); 
            setCanResend(false); 
        } else {
            setOtpError(data.message || "Invalid or expired OTP.");
        }
    } catch (error) {
        setOtpError("Unable to verify OTP.");
    } finally {
        setOtpLoading(false);
    }
  };

  // 3. กดปุ่ม "Create Account" (ปุ่มใหญ่)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMainLoading(true);
    setMainError("");

    if (!isEmailVerified) {
        setMainError("Please verify your email address first.");
        setMainLoading(false);
        return;
    }

    if (!name.trim() || !studentId.trim() || !password.trim() || !confirmPassword.trim()) {
      setMainError("Please fill in all remaining fields");
      setMainLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setMainError("Passwords do not match");
      setMainLoading(false);
      return;
    }
    if (!passwordStrength.hasLength || !passwordStrength.hasUpper || 
        !passwordStrength.hasLower || !passwordStrength.hasNumber) {
      setMainError("รหัสผ่านไม่ตรงตามข้อกำหนดด้านความปลอดภัย");
      setMainLoading(false);
      return;
    }

    try {
      setMainSuccess("Creating your account...");
      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade3.onrender.com";
      
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(),
          password, 
          name: name.trim(), 
          studentId: studentId.trim() 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMainSuccess("Account created successfully! Redirecting...");
        setTimeout(() => {
          navigate("/login", { state: { registeredEmail: email.toLowerCase().trim() } });
        }, 1500);
      } else {
        setMainError(data.message || "Registration failed.");
        setMainSuccess("");
      }
    } catch (error) {
      setMainError("Unable to connect to the server.");
      setMainSuccess("");
    } finally {
      if (!mainSuccess) {
        setMainLoading(false);
      }
    }
  };


  return (
    <div className="login-container">
      
      <button onClick={() => navigate("/browse")} className="login-close-btn">
        <AiOutlineClose className="login-close-icon" />
      </button>

      <div className="login-left-side">
        <h1 className="login-welcome-text">Create Account</h1> 
        <div className="login-title-container">
          <IoShieldCheckmark size={60} style={{ color: 'white', marginBottom: '15px' }}/>
          <h1 className="login-title">UniTrade</h1>
          <h2 className="login-subtitle">Campus Marketplace</h2>
        </div>
        <div className="login-description-box" style={{ position: 'relative', padding: 0 }}>
          <p className="login-description" style={{ maxWidth: '300px' }}>
            สร้างบัญชีและเข้าร่วมตลาดซื้อขายของนักศึกษามหาวิทยาลัย 
            เพียงกรอกข้อมูลเพื่อเริ่มต้นใช้งานได้ทันที
          </p>
        </div>
      </div>

      <div className="login-right-side">
        <div className="login-form-container">
          <div className="login-form-header">
            <h1 className="login-form-title">Create Student Account</h1>
            <p className="login-form-subtitle">Join the UniTrade community</p>
          </div>

          {mainError && (
            <div className="login-error"><IoAlertCircle className="login-error-icon" />{mainError}</div>
          )}
          {mainSuccess && (
            <div className="login-success"><IoCheckmarkCircle className="login-error-icon" />{mainSuccess}</div>
          )}

          <form onSubmit={handleSubmit} className="login-form" style={{ gap: '1rem' }}>
            
            <div className="login-form-group">
              <label className="login-label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="login-input"
                required
                disabled={mainLoading} // ✅ แก้ไขแล้ว: เอา isEmailVerified ออก
              />
            </div>

            <div className="login-form-group">
              <label className="login-label">Email</label>
              <div className="login-input-with-button-container">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your university email (@kkumail.com)"
                  className="login-input"
                  required
                  disabled={isEmailVerified || otpLoading || mainLoading} // (อันนี้คงไว้ ถูกต้องแล้ว)
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="login-inline-btn"
                  disabled={!canResend || isEmailVerified || otpLoading || mainLoading}
                >
                  {otpLoading ? "..." : (canResend ? (isOtpSent ? "Resend" : "Send OTP") : `${resendTimer}s`)}
                </button>
              </div>
            </div>

            {isOtpSent && !isEmailVerified && (
              <div className="login-form-group">
                <label className="login-label">Verification Code</label>
                <div className="login-input-with-button-container">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="login-input"
                    required
                    maxLength={6}
                    disabled={isEmailVerified || otpLoading || mainLoading}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="login-inline-btn login-inline-btn-verify"
                    disabled={isEmailVerified || otpLoading || mainLoading}
                  >
                    {otpLoading ? "..." : "Verify"}
                  </button>
                </div>
              </div>
            )}
            
            {otpError && (
              <div className="login-otp-status login-error" style={{ marginTop: '-0.5rem' }}>
                <IoAlertCircle size={16} /> {otpError}
              </div>
            )}
            {otpSuccess && (
              <div className="login-otp-status login-success" style={{ marginTop: '-0.5rem' }}>
                <IoCheckmarkCircle size={16} /> {otpSuccess}
              </div>
            )}

            <div className="login-form-group">
              <label className="login-label">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter your student ID"
                className="login-input"
                maxLength={20}
                required
                disabled={mainLoading} // ✅ แก้ไขแล้ว: เอา isEmailVerified ออก
              />
            </div>

            <div className="login-form-group">
              <label className="login-label">Password</label>
              <div className="login-password-container">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Create a strong password"
                  className="login-input"
                  required
                  disabled={mainLoading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="login-password-toggle" disabled={mainLoading}>
                  {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </button>
              </div>
              {password && (
                <div className="password-requirements" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  <div className={passwordStrength.hasLength ? 'req-met' : 'req-unmet'}>{passwordStrength.hasLength ? '✓' : '○'} At least 8 characters</div>
                  <div className={passwordStrength.hasUpper ? 'req-met' : 'req-unmet'}>{passwordStrength.hasUpper ? '✓' : '○'} One uppercase letter</div>
                  <div className={passwordStrength.hasLower ? 'req-met' : 'req-unmet'}>{passwordStrength.hasLower ? '✓' : '○'} One lowercase letter</div>
                  <div className={passwordStrength.hasNumber ? 'req-met' : 'req-unmet'}>{passwordStrength.hasNumber ? '✓' : '○'} One number</div>
                </div>
              )}
            </div>

            <div className="login-form-group">
              <label className="login-label">Confirm Password</label>
              <div className="login-password-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="login-input"
                  required
                  disabled={mainLoading}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="login-password-toggle" disabled={mainLoading}>
                  {showConfirmPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isEmailVerified || mainLoading || !!mainSuccess}
              className="login-submit-btn"
            >
              {mainLoading ? (
                <>
                  <svg className="login-spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
                  {mainSuccess || 'Creating Account...'}
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="login-register-link" style={{ marginTop: '1.5rem' }}>
            <p>Already have an account? <Link to="/login" className="login-register-link a">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;