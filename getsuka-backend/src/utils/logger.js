import crypto from "crypto";

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "confirmpassword",
  "token",
  "admintoken",
  "accesstoken",
  "refreshtoken",
  "jwt",
  "authorization",
  "otp",
  "code",
  "secret",
  "webhooksecret",
  "razorpay_signature",
  "razorpaysignature",
  "signature",
  "cardnumber",
  "cvv",
  "expiry",
  "cookie",
]);

export const sanitizeValue = (key, value, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;

  const normalizedKey = String(key || "")
    .toLowerCase()
    .replace(/[-_]/g, "");

  if (SENSITIVE_KEYS.has(normalizedKey)) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    // Redact Bearer tokens
    if (/^Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/i.test(value)) {
      return "Bearer [REDACTED]";
    }
    // Redact raw JWTs
    if (/^[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_.+/=]{20,}$/.test(value)) {
      return "[REDACTED_JWT]";
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(key, item, seen));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      statusCode: value.statusCode,
      stack: value.stack,
    };
  }

  if (typeof value === "object" && !(value instanceof Date)) {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);

    const sanitizedObj = {};
    for (const [k, v] of Object.entries(value)) {
      sanitizedObj[k] = sanitizeValue(k, v, seen);
    }
    return sanitizedObj;
  }

  return value;
};

const getLogLevel = () => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return LOG_LEVELS[envLevel];
  }
  if (process.env.NODE_ENV === "test") {
    return LOG_LEVELS.error; // Keep test output clean unless explicitly configured
  }
  if (process.env.NODE_ENV === "production") {
    return LOG_LEVELS.info;
  }
  return LOG_LEVELS.debug;
};

const formatOutput = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = meta && typeof meta === "object" ? sanitizeValue("", meta) : meta;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const logObj = {
      timestamp,
      level,
      message: typeof message === "string" ? message : sanitizeValue("", message),
      ...(sanitizedMeta && Object.keys(sanitizedMeta).length > 0 ? { context: sanitizedMeta } : {}),
    };
    return JSON.stringify(logObj);
  }

  const metaStr =
    sanitizedMeta && Object.keys(sanitizedMeta).length > 0
      ? ` ${JSON.stringify(sanitizedMeta)}`
      : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

export const logger = {
  debug: (message, meta) => {
    if (getLogLevel() <= LOG_LEVELS.debug) {
      console.debug(formatOutput("debug", message, meta));
    }
  },
  info: (message, meta) => {
    if (getLogLevel() <= LOG_LEVELS.info) {
      console.info(formatOutput("info", message, meta));
    }
  },
  warn: (message, meta) => {
    if (getLogLevel() <= LOG_LEVELS.warn) {
      console.warn(formatOutput("warn", message, meta));
    }
  },
  error: (message, meta) => {
    if (getLogLevel() <= LOG_LEVELS.error) {
      console.error(formatOutput("error", message, meta));
    }
  },
};

export default logger;
