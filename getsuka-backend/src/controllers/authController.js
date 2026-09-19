import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import OtpVerification from "../models/OtpVerification.js";
import PasswordResetOtp from "../models/PasswordResetOtp.js";

import { registerSchema } from "../validations/authValidation.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail } from "../services/emailService.js";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      sub: googleId,
      email,
      name,
      email_verified,
    } = payload;

    if (!email || !email_verified) {
      return res.status(400).json({
        success: false,
        message: "Google email could not be verified",
      });
    }

    const normalizedEmail = email.toLowerCase();

    let user = await User.findOne({
      email: normalizedEmail,
    });

         console.log("login users:",user)


    if (!user) {
      user = await User.create({
        fullName: name || "Google User",
        email: normalizedEmail,
        password: `google_${googleId}`,
        isVerified: true,
      });
    } else {
      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: "Your account has been blocked",
        });
      }

      user.isVerified = true;

      await user.save();
    }

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

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error(
      "Google login error:",
      error
    );

    return res.status(401).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};
// ==============================
// REGISTER USER
// ==============================
export const registerUser = async (req, res) => {
  try {
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { fullName, email, password } = validationResult.data;

    const existingUser = await User.findOne({ email });

    // Existing user
    if (existingUser) {
      // Already verified
      if (existingUser.isVerified) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      // Existing but not verified
      // Update name and password
      const hashedPassword = await bcrypt.hash(
        password,
        10
      );

      existingUser.fullName = fullName;
      existingUser.password = hashedPassword;

      await existingUser.save();

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

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // Create user
    await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

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

    const normalizedEmail = email.toLowerCase();

    const otpRecord = await OtpVerification.findOne({
      email: normalizedEmail,
      otp,
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

    if (!user) {
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

    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
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
  
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase();

    // Find user 
    const user = await User.findOne({
      email: normalizedEmail,
    });
 
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
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

    const normalizedEmail = email.toLowerCase();

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email",
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

    const normalizedEmail = email.toLowerCase();

    // Find reset OTP
    const otpRecord =
      await PasswordResetOtp.findOne({
        email: normalizedEmail,
        otp,
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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash new password
    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

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
}


