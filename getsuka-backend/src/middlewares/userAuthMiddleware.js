import jwt from "jsonwebtoken";
import User from "../features/auth/models/User.js";

const userAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (decoded.role && decoded.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "User access required",
      });
    }

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    // Database verification: Source of truth for account state
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or account no longer exists",
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deleted",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email to access this resource",
      });
    }

    req.user = {
      userId: user._id.toString(),
      id: user._id.toString(),
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: decoded.role || "user",
      isVerified: user.isVerified,
      isBlocked: user.isBlocked,
      authProvider: user.authProvider || "local",
    };

    req.currentUser = user;

    if (typeof res?.set === "function") {
      res.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
    } else if (typeof res?.setHeader === "function") {
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
    }

    next();
  } catch (error) {
    console.error("User Auth Middleware Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

export default userAuthMiddleware;