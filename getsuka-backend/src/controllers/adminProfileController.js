import Admin from "../models/Admin.js";

/* =========================================
   GET ADMIN PROFILE
========================================= */

export const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.adminId;

    const admin = await Admin.findById(adminId).select(
      "-password"
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error(
      "Get admin profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin profile",
    });
  }
};
/* =========================================
   UPDATE ADMIN PROFILE
========================================= */

export const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.adminId;

    const {
      fullName,
      email,
      phone,
    } = req.body;

    if (!fullName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
      _id: { $ne: adminId },
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Email address is already in use",
      });
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    admin.fullName = fullName.trim();
    admin.email = normalizedEmail;
    admin.phone = phone?.trim() || "";

    await admin.save();

    const updatedAdmin = await Admin.findById(
      adminId
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Admin profile updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error(
      "Update admin profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update admin profile",
    });
  }
};