import * as yup from "yup";

export const registerSchema = yup.object({
  fullName: yup
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .required("Full name is required"),

  email: yup
    .string()
    .trim()
    .email("Please enter a valid email address")
    .required("Email is required"),

  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
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
});