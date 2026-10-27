import * as yup from "yup";

export const otpSchema = yup.object({
  otp: yup
    .string()
    .required("OTP is required")
    .matches(/^[0-9]{6}$/, "OTP must be 6 digits"),
});