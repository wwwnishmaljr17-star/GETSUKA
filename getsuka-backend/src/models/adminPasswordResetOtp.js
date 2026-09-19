import mongoose from "mongoose";

const adminPasswordResetOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    otp: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const AdminPasswordResetOtp = mongoose.model(
  "AdminPasswordResetOtp",
  adminPasswordResetOtpSchema
);

export default AdminPasswordResetOtp;