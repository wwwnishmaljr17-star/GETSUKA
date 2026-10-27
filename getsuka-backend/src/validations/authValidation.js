import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(50, "Full name cannot exceed 50 characters")
    .regex(
      /^[\p{L}\s'-]+$/u,
      "Full name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(100, "Email cannot exceed 100 characters")
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters")
    .regex(
      /[A-Z]/,
      "Password must contain at least one uppercase letter"
    )
    .regex(
      /[a-z]/,
      "Password must contain at least one lowercase letter"
    )
    .regex(
      /[0-9]/,
      "Password must contain at least one number"
    )
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),

  referralCode: z
    .string()
    .trim()
    .max(50, "Referral code cannot exceed 50 characters")
    .optional()
    .or(z.literal("")),
});