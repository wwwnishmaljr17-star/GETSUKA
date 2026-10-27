import * as yup from "yup";

export const registerSchema = yup.object({
  fullName: yup
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(50, "Full name cannot exceed 50 characters")
    .matches(
      /^[\p{L}\s'-]+$/u,
      "Full name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .required("Full name is required"),

  email: yup
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(100, "Email cannot exceed 100 characters")
    .required("Email is required"),

  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters")
    .matches(
      /[A-Z]/,
      "Password must contain at least one uppercase letter"
    )
    .matches(
      /[a-z]/,
      "Password must contain at least one lowercase letter"
    )
    .matches(
      /[0-9]/,
      "Password must contain at least one number"
    )
    .matches(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    )
    .required("Password is required"),

  confirmPassword: yup
    .string()
    .oneOf(
      [yup.ref("password")],
      "Passwords do not match"
    )
    .required("Please confirm your password"),

  referralCode: yup
    .string()
    .trim()
    .max(50, "Referral code cannot exceed 50 characters")
    .optional(),
});