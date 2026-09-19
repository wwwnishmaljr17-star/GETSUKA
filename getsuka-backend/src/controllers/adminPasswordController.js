import bcrypt from "bcryptjs";

import Admin from "../models/Admin.js";

/* =========================================
   CHANGE ADMIN PASSWORD
========================================= */

export const changeAdminPassword = async (req, res) => {
  try {
    const adminId = req.admin.adminId;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;


    // =========================================
    // REQUIRED FIELDS
    // =========================================

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }


    // =========================================
    // CHECK PASSWORD MATCH
    // =========================================

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }


    // =========================================
    // PASSWORD VALIDATION
    // =========================================

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters",
      });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one uppercase letter",
      });
    }

    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one lowercase letter",
      });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one number",
      });
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]/;'`~+=]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one special character",
      });
    }


    // =========================================
    // FIND ADMIN
    // =========================================

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }


    // =========================================
    // CHECK CURRENT PASSWORD
    // =========================================

    const isCurrentPasswordCorrect =
      await bcrypt.compare(
        currentPassword,
        admin.password
      );

    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }


    // =========================================
    // PREVENT SAME PASSWORD
    // =========================================

    const isSamePassword =
      await bcrypt.compare(
        newPassword,
        admin.password
      );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from current password",
      });
    }


    // =========================================
    // HASH NEW PASSWORD
    // =========================================

    const hashedPassword =
      await bcrypt.hash(newPassword, 10);


    // =========================================
    // UPDATE PASSWORD
    // =========================================

    admin.password = hashedPassword;

    await admin.save();


    // =========================================
    // SUCCESS
    // =========================================

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error) {

    console.error(
      "Change admin password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update password",
    });
  }
};