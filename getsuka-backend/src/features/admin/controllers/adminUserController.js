import mongoose from "mongoose";
import User from "../../auth/models/User.js";

/* =========================================
   GET ALL USERS
========================================= */

export const getUsers = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(
      Number(page),
      1
    );

    const usersPerPage = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

 

    const cleanSearch = String(search || "").trim();
    const searchFilter = cleanSearch
      ? {
          isDeleted: { $ne: true },
          $or: [
            {
              fullName: {
                $regex: cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                $options: "i",
              },
            },
            {
              email: {
                $regex: cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                $options: "i",
              },
            },
          ],
        }
      : { isDeleted: { $ne: true } };

    const skip = (currentPage - 1) * usersPerPage;

    const [users, totalUsers] = await Promise.all([
      User.find(searchFilter)
        .select("-password")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(usersPerPage)
        .lean(),

      User.countDocuments(searchFilter),
    ]);

    const totalPages = Math.ceil(
      totalUsers / usersPerPage
    );

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        currentPage,
        usersPerPage,
        totalUsers,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Get users error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

/* =========================================
   GET SINGLE USER
========================================= */

export const getUserById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id)
      .select("-password")
      .lean();

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
    console.error(
      "Get user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};


/* =========================================
   BLOCK USER
========================================= */

export const blockUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot block a deleted customer account",
      });
    }

    if (user.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "User is already blocked",
      });
    }

    user.isBlocked = true;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User blocked successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        isBlocked: user.isBlocked,
      },
    });

  } catch (error) {
    console.error(
      "Block user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to block user",
    });
  }
};


/* =========================================
   UNBLOCK USER
========================================= */

export const unblockUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot unblock a deleted customer account",
      });
    }

    if (!user.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "User is already active",
      });
    }

    user.isBlocked = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        isBlocked: user.isBlocked,
      },
    });

  } catch (error) {
    console.error(
      "Unblock user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to unblock user",
    });
  }
};


/* =========================================
   DELETE USER
========================================= */

export const deleteUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Idempotent: if already deleted, return success without error or re-mutation
    if (user.isDeleted) {
      return res.status(200).json({
        success: true,
        message: "User is already deleted",
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          isDeleted: true,
        },
      });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.admin?._id || req.admin?.adminId || null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        isDeleted: true,
      },
    });

  } catch (error) {
    console.error(
      "Delete user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};