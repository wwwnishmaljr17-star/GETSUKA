import rateLimit from "express-rate-limit";

/**
 * Factory helper to construct standardized rate limiters for authentication endpoints.
 */
export const createAuthLimiter = ({
  windowMs,
  max,
  message,
  skipSuccessfulRequests = false,
}) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    validate: {
      xForwardedForHeader: false,
      default: false,
    },
    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        message,
      });
    },
  });
};

// ============================================================================
// 1. LOGIN LIMITER (Mitigates brute-force attacks and credential stuffing)
// 10 requests per 15 minutes per IP
// ============================================================================
export const loginLimiter = createAuthLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again after 15 minutes.",
});

// ============================================================================
// 2. OTP VERIFICATION LIMITER (Prevents automated OTP guessing)
// 5 attempts per 15 minutes per IP
// ============================================================================
export const otpVerifyLimiter = createAuthLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many OTP verification attempts. Please try again after 15 minutes.",
});

// ============================================================================
// 3. OTP RESEND LIMITER (Prevents mail/SMS flooding and resource exhaustion)
// 3 requests per 15 minutes per IP
// ============================================================================
export const otpResendLimiter = createAuthLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: "Too many OTP resend requests. Please wait before requesting another OTP.",
});

// ============================================================================
// 4. REGISTRATION LIMITER (Prevents automated bulk account creation spam)
// 10 requests per 1 hour per IP
// ============================================================================
export const registerLimiter = createAuthLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many registration attempts from this IP. Please try again later.",
});

// ============================================================================
// 5. FORGOT PASSWORD LIMITER (Prevents mass reset email triggers and enumeration)
// 5 requests per 15 minutes per IP
// ============================================================================
export const forgotPasswordLimiter = createAuthLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset requests. Please try again after 15 minutes.",
});

// ============================================================================
// 6. PASSWORD RESET LIMITER (Prevents repeated password reset attempts)
// 5 requests per 15 minutes per IP
// ============================================================================
export const resetPasswordLimiter = createAuthLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts. Please try again after 15 minutes.",
});
