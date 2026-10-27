import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import OtpVerification from "../models/otpVerification.js";
import PasswordResetOtp from "../models/PasswordResetOtp.js";

import { registerSchema } from "../../../validations/authValidation.js";
import { generateOtp } from "../../../utils/generateOtp.js";
import { sendOtpEmail } from "../../../services/emailService.js";
import Referral from "../../referral/models/referral.js";
import { attributeReferral } from "../../referral/controllers/referralController.js";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// ==============================
// GOOGLE LOGIN
// ==============================
export const googleLogin = async (req, res) => {
  try {
    const { credential, referralCode } = req.body;

    if (!credential || typeof credential !== "string" || !credential.trim()) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error("Google authentication configuration missing: GOOGLE_CLIENT_ID is not configured");
      return res.status(500).json({
        success: false,
        message: "Google authentication is not configured on the server",
      });
    }

    let payload;
    try {
      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken: credential.trim(),
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error("Google token verification error:", verifyError.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Google token",
      });
    }

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Google token",
      });
    }

    // Validate token issuer, audience, and expiration
    const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
    if (payload.iss && !validIssuers.includes(payload.iss)) {
      return res.status(401).json({
        success: false,
        message: "Invalid token issuer",
      });
    }

    if (payload.aud && payload.aud !== googleClientId) {
      return res.status(401).json({
        success: false,
        message: "Token audience mismatch",
      });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSeconds) {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    const {
      sub: googleId,
      email,
      name,
      email_verified,
    } = payload;

    const isEmailVerified = email_verified === true || email_verified === "true";

    if (!googleId || !email || !isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Google email could not be verified",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({
      email: normalizedEmail,
    });

    // ==============================
    // NEW GOOGLE USER
    // ==============================
    if (!user) {
      user = await User.create({
        fullName: (name || "Google User").trim(),
        email: normalizedEmail,
        authProvider: "google",
        googleId,
        isVerified: true,
      });

      if (referralCode && typeof referralCode === "string" && referralCode.trim()) {
        try {
          await attributeReferral({
            referralCode: referralCode.trim().toUpperCase(),
            referredUserId: user._id,
            referredEmail: user.email,
          });
        } catch (refErr) {
          console.warn("Google signup referral attribution failed:", refErr.message);
        }
      }
    }

    // ==============================
    // EXISTING USER
    // ==============================
    else {
      if (user.isDeleted) {
        return res.status(403).json({
          success: false,
          message: "Your account has been deleted or deactivated",
        });
      }

      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: "Your account has been blocked",
        });
      }

      /*
       * If this account was previously created with Google,
       * keep the Google authentication information updated.
       *
       * If an existing local account uses the same email,
       * we safely link the Google ID while preserving their
       * original password-based authentication.
       */
      if (user.authProvider === "google") {
        user.googleId = googleId;
        user.isVerified = true;
        await user.save();
      } else {
        if (user.googleId && user.googleId !== googleId) {
          return res.status(409).json({
            success: false,
            message: "This account is already linked to a different Google identity",
          });
        }
        user.googleId = googleId;
        user.isVerified = true;
        await user.save();
      }
    }

    // ==============================
    // CREATE JWT
    // ==============================
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: "user",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // ==============================
    // LOGIN SUCCESS
    // ==============================
    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isVerified: user.isVerified,
        authProvider: user.authProvider || "local",
      },
    });
  } catch (error) {
    console.error("Google login unexpected error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==============================
// REGISTER USER
// ==============================
export const registerUser = async (req, res) => {
  try {
    const validationResult =
      registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors:
          validationResult.error.flatten()
            .fieldErrors,
      });
    }

    const {
      fullName,
      email,
      password,
      referralCode,
    } = validationResult.data;

    let cleanReferralCode = null;
    let referrerUser = null;
    if (referralCode && typeof referralCode === "string" && referralCode.trim()) {
      cleanReferralCode = referralCode.trim().toUpperCase();
      referrerUser = await User.findOne({ referralCode: cleanReferralCode });

      if (!referrerUser) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code. No account found matching this code.",
        });
      }

      if (referrerUser.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: "You cannot use your own referral code.",
        });
      }
    }

    const existingUser = await User.findOne({
      email,
    });

    // ==============================
    // EXISTING USER
    // ==============================

    if (existingUser) {
      if (existingUser.isDeleted) {
        return res.status(403).json({
          success: false,
          message: "An account associated with this email has been deactivated. Please contact support.",
        });
      }

      // Already verified
      if (existingUser.isVerified) {
        return res.status(409).json({
          success: false,
          message:
            "User with this email already exists",
        });
      }

      // Existing but not verified
      // Update name and password
      const hashedPassword =
        await bcrypt.hash(password, 10);

      existingUser.fullName = fullName;
      existingUser.password = hashedPassword;

      await existingUser.save();

      // If user provided a valid referral code and doesn't already have attribution, attribute it
      if (cleanReferralCode && referrerUser) {
        const existingRef = await Referral.findOne({ referredUser: existingUser._id });
        if (!existingRef) {
          await attributeReferral({
            referralCode: cleanReferralCode,
            referredUserId: existingUser._id,
            referredEmail: existingUser.email,
          });
        }
      }

      // Generate new OTP
      const otp = generateOtp();

      // Delete old OTP
      await OtpVerification.deleteMany({
        email,
      });

      // OTP expires in 5 minutes
      const expiresAt = new Date(
        Date.now() + 5 * 60 * 1000
      );

      // Save new OTP
      await OtpVerification.create({
        email,
        otp,
        expiresAt,
      });

      // Send OTP
      await sendOtpEmail(
        email,
        otp
      );

      return res.status(200).json({
        success: true,
        message:
          "Account updated successfully. New OTP sent to your email.",
        email,
      });
    }

    // ==============================
    // NEW USER
    // ==============================

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      authProvider: "local",
      googleId: "",
    });

    // Attribute referral if referral code was supplied
    if (cleanReferralCode && referrerUser) {
      await attributeReferral({
        referralCode: cleanReferralCode,
        referredUserId: newUser._id,
        referredEmail: newUser.email,
      });
    }

    // Generate OTP
    const otp = generateOtp();

    // Remove old OTP
    await OtpVerification.deleteMany({
      email,
    });

    // OTP expires in 5 minutes
    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    // Save OTP
    await OtpVerification.create({
      email,
      otp,
      expiresAt,
    });

    // Send OTP
    await sendOtpEmail(
      email,
      otp
    );

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. OTP sent to your email.",
      email,
    });
  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==============================
// VERIFY REGISTRATION OTP
// ==============================
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail =
      String(email).trim().toLowerCase();
    const normalizedOtp =
      String(otp).trim();

    if (!/^\d{6}$/.test(normalizedOtp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format",
      });
    }

    const otpRecord =
      await OtpVerification.findOne({
        email: normalizedEmail,
        otp: normalizedOtp,
      });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check expiry
    if (otpRecord.expiresAt < new Date()) {
      await OtpVerification.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify user
    user.isVerified = true;

    await user.save();

    // Delete used OTP
    await OtpVerification.deleteOne({
      _id: otpRecord._id,
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error(
      "OTP verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==============================
// RESEND REGISTRATION OTP
// ==============================
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail =
      email.toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new OTP
    const otp = generateOtp();

    // Delete previous OTP
    await OtpVerification.deleteMany({
      email: normalizedEmail,
    });

    // OTP expires in 5 minutes
    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    // Save new OTP
    await OtpVerification.create({
      email: normalizedEmail,
      otp,
      expiresAt,
    });

    // Send email
    await sendOtpEmail(
      normalizedEmail,
      otp
    );

    return res.status(200).json({
      success: true,
      message: "New OTP sent to your email.",
    });
  } catch (error) {
    console.error(
      "Resend OTP error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==============================
// LOGIN USER
// ==============================
export const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // Check required fields
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check deleted account
    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deleted or deactivated",
      });
    }

    // Check email verification
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email before logging in",
      });
    }

    // Check blocked account
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked",
      });
    }

    // Google accounts must log in via Google
    if (user.authProvider === "google") {
      return res.status(401).json({
        success: false,
        message:
          "This account uses Google login. Please continue with Google.",
      });
    }

    // Compare password
    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

   

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: "user",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Login success
    return res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isVerified: user.isVerified,
        authProvider:
          user.authProvider || "local",
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==============================
// FORGOT PASSWORD
// ==============================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail =
      email.toLowerCase();

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email",
      });
    }

    // Google accounts do not use password reset
    if (user.authProvider === "google") {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google login. Password reset is not available.",
      });
    }

    // User must be verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email before resetting your password",
      });
    }

    // Generate password reset OTP
    const otp = generateOtp();

    // Delete old reset OTP
    await PasswordResetOtp.deleteMany({
      email: normalizedEmail,
    });

    // OTP expires in 5 minutes
    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    // Save reset OTP
    await PasswordResetOtp.create({
      email: normalizedEmail,
      otp,
      expiresAt,
    });

    // Send OTP
    await sendOtpEmail(
      normalizedEmail,
      otp
    );

    return res.status(200).json({
      success: true,
      message:
        "Password reset OTP sent to your email.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==============================
// RESET PASSWORD
// ==============================
export const resetPassword = async (req, res) => {
  try {
    const {
      email,
      otp,
      password,
      confirmPassword,
    } = req.body;

    if (
      !email ||
      !otp ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, OTP, password and confirm password are required",
      });
    }

    // Check password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const normalizedEmail =
      String(email).trim().toLowerCase();
    const normalizedOtp =
      String(otp).trim();

    if (!/^\d{6}$/.test(normalizedOtp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format",
      });
    }

    // Find reset OTP
    const otpRecord =
      await PasswordResetOtp.findOne({
        email: normalizedEmail,
        otp: normalizedOtp,
      });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check OTP expiry
    if (otpRecord.expiresAt < new Date()) {
      await PasswordResetOtp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Google users should not reset password
    if (user.authProvider === "google") {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google login. Password reset is not available.",
      });
    }

    // Hash new password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Update password
    user.password = hashedPassword;

    await user.save();

    // Delete used OTP
    await PasswordResetOtp.deleteOne({
      _id: otpRecord._id,
    });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};