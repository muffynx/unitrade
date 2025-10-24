import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineClose, AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { IoCheckmarkCircle, IoAlertCircle, IoShieldCheckmark } from "react-icons/io5"; // ยังคงใช้ไอคอนใหม่
import "./style/Loginstyle.css"; // Assumes this path is correct

const Register = () => {
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    hasLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false
  });
  const navigate = useNavigate();

  // ตรวจสอบความแข็งแรงของ password
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    setLoadingMessage("Validating information...");

    // Validation
    if (!name.trim() || !email.trim() || !studentId.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!passwordStrength.hasLength || !passwordStrength.hasUpper || 
        !passwordStrength.hasLower || !passwordStrength.hasNumber) {
      setError("Password doesn't meet security requirements (min 8 chars, UL, LL, number)");
      setIsLoading(false);
      return;
    }

    try {
      setLoadingMessage("Creating your account...");
      const API_URL = import.meta.env.VITE_API_URL || "https://unitrade2.onrender.com";
      
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
        setSuccessMessage("Account created successfully! Redirecting to login...");
        setLoadingMessage("Redirecting...");
        
        setTimeout(() => {
          navigate("/login", { state: { registeredEmail: email.toLowerCase().trim() } });
        }, 1500);
      } else {
        const field = data.field || 'general';
        setError(data.message || `Registration failed. Error in field: ${field}`);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("Unable to connect to the server. Please check your internet connection.");
    } finally {
      if (!successMessage) {
        setIsLoading(false);
        setLoadingMessage("");
      }
    }
  };

  return (
    <div className="login-container">
      
      {/* Close Button (Already exists in your CSS) */}
      <button 
        onClick={() => navigate("/browse")}
        className="login-close-btn"
        aria-label="Close"
      >
        <AiOutlineClose className="login-close-icon" />
      </button>

      {/* Left Side (Branding/Info - Uses your existing CSS) */}
      <div className="login-left-side">
        <h1 className="login-welcome-text">Create Account</h1> {/* Position changed via CSS now */}
        
        <div className="login-title-container">
          <IoShieldCheckmark size={60} style={{ color: 'white', marginBottom: '15px' }}/>
          <h1 className="login-title">UniTrade</h1>
          <h2 className="login-subtitle">Campus Marketplace</h2>
        </div>
        
        {/* Adjusted Description Box content for better placement */}
        <div className="login-description-box" style={{ position: 'relative', padding: 0 }}>
          <p className="login-description" style={{ maxWidth: '300px' }}>
            สร้างบัญชีและเข้าร่วมตลาดซื้อขายของนักศึกษามหาวิทยาลัย 
            เพียงกรอกข้อมูลเพื่อเริ่มต้นใช้งานได้ทันที
          </p>
        </div>

      </div>

      {/* Right Side (Form - Uses your existing CSS) */}
      <div className="login-right-side">
        <div className="login-form-container">
          <div className="login-form-header">
            <h1 className="login-form-title">Create Student Account</h1>
            <p className="login-form-subtitle">Join the UniTrade community</p>
          </div>

          {/* Error Message (Uses your existing login-error CSS) */}
          {error && (
            <div className="login-error">
              <IoAlertCircle className="login-error-icon" />
              {error}
            </div>
          )}

          {/* Success Message (Requires new login-success CSS) */}
          {successMessage && !isLoading && (
            <div className="login-success">
              <IoCheckmarkCircle className="login-error-icon" style={{ fill: 'currentColor' }} />
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" style={{ gap: '1rem' }}>
            {/* Full Name */}
            <div className="login-form-group">
              <label className="login-label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="login-input"
                required
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div className="login-form-group">
              <label className="login-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your university email"
                className="login-input"
                required
                disabled={isLoading}
              />
            </div>

            {/* Student ID */}
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
                disabled={isLoading}
              />
            </div>

            {/* Password */}
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

              {/* Password Strength Indicator (Needs accompanying CSS) */}
              {password && (
                <div className="password-requirements" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  <div className={passwordStrength.hasLength ? 'req-met' : 'req-unmet'}>
                    {passwordStrength.hasLength ? '✓' : '○'} At least 8 characters
                  </div>
                  <div className={passwordStrength.hasUpper ? 'req-met' : 'req-unmet'}>
                    {passwordStrength.hasUpper ? '✓' : '○'} One uppercase letter
                  </div>
                  <div className={passwordStrength.hasLower ? 'req-met' : 'req-unmet'}>
                    {passwordStrength.hasLower ? '✓' : '○'} One lowercase letter
                  </div>
                  <div className={passwordStrength.hasNumber ? 'req-met' : 'req-unmet'}>
                    {passwordStrength.hasNumber ? '✓' : '○'} One number
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
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
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="login-password-toggle"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <AiOutlineEyeInvisible size={20} />
                  ) : (
                    <AiOutlineEye size={20} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !!successMessage}
              className="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <svg className="login-spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                  {loadingMessage || 'Creating Account...'}
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="login-register-link" style={{ marginTop: '1.5rem' }}>
            <p>
              Already have an account?{" "}
              <Link to="/login" className="login-register-link a">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;