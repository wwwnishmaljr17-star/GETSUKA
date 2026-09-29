import bcrypt from "bcryptjs";
import User from "../../auth/models/User.js";
import cloudinary from "../../../config/cloudinary.js";
import EmailChangeOtp from "../models/EmailChangeOtp.js";
import { sendOtpEmail } from "../../../services/emailService.js";

// ============================================
// GET USER PROFILE
// ============================================

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

// ============================================
// UPDATE USER PROFILE
// ============================================

export const updateUserProfile = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;

    const {
      fullName,
      email,
      phone,
      dateOfBirth,
    } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message:
          "Full name and email are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentEmail =
      user.email.trim().toLowerCase();

    if (
      normalizedEmail !== currentEmail
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email change requires OTP verification",
      });
    }

    user.fullName = fullName.trim();

    user.phone =
      phone?.trim() || "";

    user.dateOfBirth =
      dateOfBirth || null;

    // ========================================
    // PROFILE IMAGE
    // ========================================

    if (req.file) {
      const imageUrl =
        await new Promise(
          (resolve, reject) => {
            const uploadStream =
              cloudinary.uploader.upload_stream(
                {
                  folder:
                    "getsuka/profile-images",
                  resource_type: "image",
                },
                (
                  error,
                  result
                ) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(
                      result.secure_url
                    );
                  }
                }
              );

            uploadStream.end(
              req.file.buffer
            );
          }
        );

      user.profileImage =
        imageUrl;
    }

    await user.save();

    const updatedUser =
      await User.findById(
        userId
      ).select("-password");

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "Update Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update profile",
    });
  }
};

// ============================================
// CHANGE PASSWORD
// ============================================

export const changePassword = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // ========================================
    // REQUIRED FIELDS
    // ========================================

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All password fields are required",
      });
    }

    // ========================================
    // CHECK NEW PASSWORD MATCH
    // ========================================

    if (
      newPassword !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New passwords do not match",
      });
    }

    // ========================================
    // PASSWORD LENGTH
    // ========================================

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 6 characters",
      });
    }

    // ========================================
    // FIND USER
    // ========================================

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    // ========================================
    // VERIFY CURRENT PASSWORD
    // ========================================

    const isCurrentPasswordCorrect =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (
      !isCurrentPasswordCorrect
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password is incorrect",
      });
    }

    // ========================================
    // PREVENT SAME PASSWORD
    // ========================================

    const isSamePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from your current password",
      });
    }

    // ========================================
    // HASH NEW PASSWORD
    // ========================================

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    user.password =
      hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully",
    });
  } catch (error) {
    console.error(
      "Change Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to change password",
    });
  }
};

// ============================================
// SEND EMAIL CHANGE OTP
// ============================================

export const sendEmailChangeOtp = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;

    const {
      newEmail,
    } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message:
          "New email is required",
      });
    }

    const normalizedEmail =
      newEmail
        .trim()
        .toLowerCase();

    const currentUser =
      await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    if (
      currentUser.email
        .trim()
        .toLowerCase() ===
      normalizedEmail
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This is already your current email",
      });
    }

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
        _id: {
          $ne: userId,
        },
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Email is already in use",
      });
    }

    const otp =
      Math.floor(
        100000 +
          Math.random() *
            900000
      ).toString();

    await EmailChangeOtp.deleteMany({
      userId,
    });

    const expiresAt =
      new Date(
        Date.now() +
          5 * 60 * 1000
      );

    await EmailChangeOtp.create({
      userId,
      newEmail:
        normalizedEmail,
      otp,
      expiresAt,
    });

    try {
      await sendOtpEmail(
        normalizedEmail,
        otp
      );
    } catch (emailError) {
      console.error(
        "Email Sending Error:",
        emailError
      );

      await EmailChangeOtp.deleteMany({
        userId,
      });

      return res.status(500).json({
        success: false,
        message:
          "Failed to send OTP email",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "OTP sent successfully",
    });
  } catch (error) {
    console.error(
      "Send Email Change OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to send OTP",
    });
  }
};

// ============================================
// VERIFY EMAIL CHANGE OTP
// ============================================

export const verifyEmailChangeOtp = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;

    const {
      otp,
    } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message:
          "OTP is required",
      });
    }

    const otpRecord =
      await EmailChangeOtp.findOne({
        userId,
        otp: otp.trim(),
      });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid OTP",
      });
    }

    if (
      otpRecord.expiresAt <
      new Date()
    ) {
      await EmailChangeOtp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        success: false,
        message:
          "OTP has expired",
      });
    }

    const existingUser =
      await User.findOne({
        email:
          otpRecord.newEmail,
        _id: {
          $ne: userId,
        },
      });

    if (existingUser) {
      await EmailChangeOtp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(409).json({
        success: false,
        message:
          "Email is already in use",
      });
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    user.email =
      otpRecord.newEmail;

    await user.save();

    await EmailChangeOtp.deleteOne({
      _id: otpRecord._id,
    });

    const updatedUser =
      await User.findById(
        userId
      ).select("-password");

    return res.status(200).json({
      success: true,
      message:
        "Email changed successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "Verify Email Change OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to verify OTP",
    });
  }
};