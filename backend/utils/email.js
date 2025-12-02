import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const EMAIL_USER = (process.env.EMAIL_USER || "").trim();
const EMAIL_PASSWORD = (process.env.EMAIL_PASSWORD || "").replace(/\s+/g, "").trim();

// Optional SMTP override for non-Gmail or custom SMTP
const SMTP_HOST = process.env.SMTP_HOST || null;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
const SMTP_SECURE = process.env.SMTP_SECURE === "true" || false;

if (!EMAIL_USER || !EMAIL_PASSWORD) {
  console.warn(
    "⚠️  EMAIL_USER and/or EMAIL_PASSWORD are not set. Email sending will fail until these are provided (use a Gmail App Password if using Gmail)."
  );
}

// A single transporter instance
function createTransporter() {
  const base = SMTP_HOST
    ? {
        host: SMTP_HOST,
        port: SMTP_PORT || 587,
        secure: SMTP_SECURE,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD,
        },
      }
    : {
        service: "gmail",
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD,
        },
      };

  return nodemailer.createTransport({
    ...base,
    logger: false,
    debug: false,
  });
}

const transporter = createTransporter();

// Verify transporter right away (helpful at startup)
(async function verifyTransporter() {
  try {
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      console.warn(
        "Skipping transporter.verify() because EMAIL_USER or EMAIL_PASSWORD is missing."
      );
      return;
    }
    await transporter.verify();
    console.log("✅ Email transporter verified (ready to send emails)");
  } catch (err) {
    console.error(
      "❌ Email transporter verification failed:",
      err && err.message ? err.message : err
    );
  }
})();

async function sendWithRetries(mailOptions, attempts = 3, delayMs = 700) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return { success: true, info };
    } catch (err) {
      lastError = err;
      console.warn(
        `Email send attempt ${attempt} failed:`,
        err && err.message ? err.message : err
      );
      if (attempt < attempts) {
        await new Promise((res) => setTimeout(res, delayMs * attempt));
      }
    }
  }
  return { success: false, error: lastError };
}

// Generate 6-digit OTP
export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP / verification email
export const sendOTPEmail = async (email, otp, type = "verification") => {
  const subject =
    type === "verification"
      ? "Verify Your Email - Clarity Retina Care"
      : type === "login"
      ? "Login Verification Code - Clarity Retina Care"
      : type === "signup"
      ? "Complete Your Registration - Clarity Retina Care"
      : "Email Verification - Clarity Retina Care";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333;
          background-color: #f4f4f4;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .header {
          background: linear-gradient(135deg, #FCE9D9 0%, #F7CBA8 100%);
          color: #3a3a3a;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .content { 
          padding: 40px 30px;
          background: #ffffff;
        }
        .content h2 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .content p {
          color: #4b5563;
          margin-bottom: 15px;
          font-size: 15px;
        }
        .otp-container {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 2px solid #2563eb;
          border-radius: 12px;
          padding: 28px;
          margin: 30px 0;
          text-align: center;
        }
        .otp-label {
          color: #6b7280;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
          font-weight: 600;
        }
        .otp-code { 
          font-size: 38px;
          font-weight: bold;
          color: #2563eb;
          letter-spacing: 10px;
          margin: 10px 0;
          font-family: 'Courier New', monospace;
        }
        .otp-expiry {
          color: #dc2626;
          font-size: 13px;
          margin-top: 10px;
          font-weight: 600;
        }
        .info-box {
          background: #f9fafb;
          border-left: 4px solid #2563eb;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .info-box h3 {
          color: #1f2937;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .info-box ul {
          margin: 0;
          padding-left: 20px;
        }
        .info-box li {
          color: #4b5563;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .security-note {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
        }
        .security-note p {
          color: #991b1b;
          font-size: 13px;
          margin: 0;
        }
        .footer { 
          text-align: center;
          padding: 30px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          color: #6b7280;
          font-size: 12px;
          margin: 5px 0;
        }
        .footer a {
          color: #2563eb;
          text-decoration: none;
        }
        .logo {
          font-size: 32px;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>Clarity Retina Care</h1>
          <p>Advanced Eye Care Technology</p>
        </div>
        
        <div class="content">
          <h2>Email Verification Required</h2>
          <p>Hello!</p>
          <p>Thank you for choosing EyeCare. To complete your ${
            type === "login" ? "login" : "registration"
          }, please use the verification code below:</p>
          
          <div class="otp-container">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">⏱️ Expires in 10 minutes</div>
          </div>
          
          <div class="info-box">
            <h3>🔒 Security Information</h3>
            <ul>
              <li>This code is valid for <strong>10 minutes only</strong></li>
              <li>Never share this code with anyone</li>
              <li>Our team will never ask for your verification code</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>

          <div class="security-note">
            <p><strong>⚠️ Security Alert:</strong> If you did not attempt to ${
              type === "login" ? "log in" : "register"
            }, please secure your account immediately by changing your password.</p>
          </div>

          <p style="margin-top: 30px;">Need help? Contact our support team at <a href="mailto:support@clarityretina.com">support@clarityretina.com</a></p>
        </div>
        
        <div class="footer">
          <p><strong>Clarity Retina Care</strong></p>
          <p>© ${new Date().getFullYear()} All rights reserved.</p>
          <p style="margin-top: 5px; font-size: 11px">
          This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"EyeCare" <${EMAIL_USER}>`,
    to: email,
    subject,
    html,
    replyTo: EMAIL_USER,
  };

  const result = await sendWithRetries(mailOptions, 3, 800);
  if (!result.success) {
    console.error("Failed to send OTP email:", result.error);
    throw result.error || new Error("Failed to send OTP email");
  }
  return { success: true, messageId: result.info.messageId };
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetLink) => {
  const subject = "Password Reset Request - Clarity Retina Care";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .header { 
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .content { 
          padding: 40px 30px;
          background: #ffffff;
        }
        .content h2 {
          color: #1f2937;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .content p {
          color: #4b5563;
          margin-bottom: 15px;
          font-size: 15px;
        }
        .button-container {
          text-align: center;
          margin: 35px 0;
        }
        .reset-button { 
          display: inline-block;
          padding: 16px 48px;
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
          color: white !important;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);
          transition: transform 0.2s;
        }
        .reset-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 8px rgba(220, 38, 38, 0.4);
        }
        .info-box {
          background: #f9fafb;
          border-left: 4px solid #dc2626;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .info-box ul {
          margin: 0;
          padding-left: 20px;
        }
        .info-box li {
          color: #4b5563;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .link-box {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 6px;
          word-break: break-all;
          margin: 20px 0;
        }
        .link-box p {
          color: #6b7280;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .link-box a {
          color: #2563eb;
          font-size: 13px;
          text-decoration: none;
        }
        .footer { 
          text-align: center;
          padding: 30px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          color: #6b7280;
          font-size: 12px;
          margin: 5px 0;
        }
        .logo {
          font-size: 32px;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="logo">🔒</div>
          <h1>Password Reset Request</h1>
        </div>
        
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hello!</p>
          <p>We received a request to reset the password for your Clarity Retina Care account. Click the button below to create a new password:</p>
          
          <div class="button-container">
            <a href="${resetLink}" class="reset-button">Reset Password</a>
          </div>
          
          <div class="info-box">
            <ul>
              <li>This link will expire in <strong>1 hour</strong></li>
              <li>If you didn't request this, you can safely ignore this email</li>
              <li>Your password won't change until you create a new one</li>
              <li>For security, this link can only be used once</li>
            </ul>
          </div>

          <div class="link-box">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <a href="${resetLink}">${resetLink}</a>
          </div>

          <p style="margin-top: 30px; color: #6b7280; font-size: 13px;">If you're having trouble, please contact our support team at <a href="mailto:support@clarityretina.com" style="color: #2563eb;">support@clarityretina.com</a></p>
        </div>
        
        <div class="footer">
          <p><strong>Clarity Retina Care</strong></p>
          <p>© ${new Date().getFullYear()} All rights reserved.</p>
          <p style="margin-top: 10px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"EyeCare" <${EMAIL_USER}>`,
    to: email,
    subject,
    html,
    replyTo: EMAIL_USER,
  };

  const result = await sendWithRetries(mailOptions, 3, 1000);
  if (!result.success) {
    console.error("Failed to send password reset email:", result.error);
    throw result.error || new Error("Failed to send password reset email");
  }
  return { success: true, messageId: result.info.messageId };
};

// Default export compatibility (optional)
export default {
  generateOTP,
  sendOTPEmail,
  sendPasswordResetEmail,
};