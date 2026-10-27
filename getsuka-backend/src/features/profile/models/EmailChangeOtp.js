import mongoose from "mongoose";

const emailChangeOtpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    newEmail: {
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

emailChangeOtpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const EmailChangeOtp = mongoose.model(
  "EmailChangeOtp",
  emailChangeOtpSchema
);

export default EmailChangeOtp;