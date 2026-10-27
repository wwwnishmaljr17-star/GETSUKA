import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const localFallbackUri = "mongodb://127.0.0.1:27017/getsuka";

  // Runtime connection state listeners
  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB runtime connection error:", { message: err.message });
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB connection disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB connection reconnected successfully");
  });

  try {
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info(`MongoDB connected successfully to ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (primaryError) {
    logger.warn("Primary MongoDB connection failed:", { error: primaryError.message });

    if (primaryUri !== localFallbackUri) {
      try {
        logger.info("Attempting fallback connection to local MongoDB...");
        await mongoose.connect(localFallbackUri, {
          serverSelectionTimeoutMS: 3000,
        });
        logger.warn(`Connected to local fallback MongoDB (${mongoose.connection.host}/${mongoose.connection.name})`);
        return;
      } catch (fallbackError) {
        logger.error("Local MongoDB fallback failed:", { error: fallbackError.message });
      }
    }

    logger.error("CRITICAL: Could not connect to any MongoDB instance. Ensure MongoDB is running or Atlas IP is whitelisted (0.0.0.0/0)");
    process.exit(1);
  }
};

export default connectDB;