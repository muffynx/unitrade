import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// สร้าง transporter (ใช้ Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your-email@gmail.com
    pass: process.env.EMAIL_APP_PASSWORD, // App Password from Google
  },
});

// สร้าง OTP 6 หลัก
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ส่ง OTP Email
export const sendOTPEmail = async (
  email: string,
  otp: string,
  name: string
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: `"UniTrade" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Verify Your UniTrade Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 20px;
              text-align: center;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 700;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .otp-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-label {
              font-size: 14px;
              opacity: 0.9;
              margin-bottom: 10px;
            }
            .otp-code {
              font-size: 42px;
              font-weight: 700;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .info-text {
              color: #666;
              font-size: 14px;
              line-height: 1.6;
              margin: 20px 0;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning-text {
              color: #856404;
              font-size: 13px;
              margin: 0;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #6c757d;
              font-size: 12px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 UniTrade</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Campus Marketplace</p>
            </div>
            
            <div class="content">
              <p class="greeting">Hello <strong>${name}</strong>,</p>
              
              <p class="info-text">
                Thank you for registering with UniTrade! To complete your registration and verify your email address, please use the OTP code below:
              </p>
              
              <div class="otp-box">
                <div class="otp-label">Your OTP Code</div>
                <div class="otp-code">${otp}</div>
              </div>
              
              <p class="info-text">
                This code will expire in <strong>10 minutes</strong>. If you didn't request this code, please ignore this email.
              </p>
              
              <div class="warning">
                <p class="warning-text">
                  ⚠️ <strong>Security Notice:</strong> Never share this code with anyone. UniTrade staff will never ask for your OTP code.
                </p>
              </div>
              
              <p class="info-text">
                If you have any questions, feel free to contact our support team.
              </p>
            </div>
            
            <div class="footer">
              <p>© 2024 UniTrade - Campus Marketplace</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ OTP Email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    return false;
  }
};

// ส่ง Welcome Email (หลังจาก verify สำเร็จ)
export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: `"UniTrade" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎉 Welcome to UniTrade!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 20px;
              text-align: center;
              color: white;
            }
            .content {
              padding: 40px 30px;
            }
            .button {
              display: inline-block;
              padding: 14px 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .feature-box {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #6c757d;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to UniTrade!</h1>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; color: #333;">Hello <strong>${name}</strong>,</p>
              
              <p>Your account has been successfully verified! You're now part of the UniTrade community.</p>
              
              <div class="feature-box">
                <h3 style="margin-top: 0;">What you can do now:</h3>
                <ul>
                  <li>📦 Browse products from fellow students</li>
                  <li>💰 List your items for sale</li>
                  <li>💬 Chat with buyers and sellers</li>
                  <li>⭐ Rate and review transactions</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/browse" class="button">
                  Start Browsing
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>© 2024 UniTrade - Campus Marketplace</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome Email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
};