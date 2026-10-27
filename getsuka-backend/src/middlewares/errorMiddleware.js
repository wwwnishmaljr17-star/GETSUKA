import logger from "../utils/logger.js";
import AppError from "../utils/AppError.js";

export const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // 1. Handle CORS policy errors
  if (error.message && error.message.includes("CORS request blocked")) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }

  // 2. Handle Body Parser JSON SyntaxError (malformed request body)
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    error = new AppError("Malformed JSON payload in request body", 400);
  }

  // 3. Handle Mongoose CastError (e.g., invalid ObjectId in params/query)
  else if (error.name === "CastError") {
    error = new AppError(
      `Invalid ${error.path || "identifier"}: ${error.value}`,
      400
    );
  }

  // 4. Handle Mongoose Schema ValidationError
  else if (error.name === "ValidationError") {
    const messages = Object.values(error.errors || {})
      .map((e) => e.message)
      .join(", ");
    error = new AppError(messages || "Validation failed", 400);
  }

  // 5. Handle MongoDB Duplicate Key Error (code 11000)
  else if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || "field";
    error = new AppError(
      `A record with this ${field} already exists. Please use a unique value.`,
      409
    );
  }

  // 6. Handle JWT authentication errors
  else if (error.name === "JsonWebTokenError") {
    error = new AppError("Invalid authentication token", 401);
  } else if (error.name === "TokenExpiredError") {
    error = new AppError("Authentication token expired", 401);
  }

  // 7. Handle Multer file upload errors
  else if (error.name === "MulterError") {
    error = new AppError(`File upload error: ${error.message}`, 400);
  }

  // 8. Handle Zod Schema Validation Errors
  else if (error.name === "ZodError") {
    const messages = error.errors?.map((e) => e.message).join(", ");
    error = new AppError(messages || "Validation failed", 400, error.errors);
  }

  const statusCode = error.statusCode || error.status || 500;
  const isProduction = process.env.NODE_ENV === "production";

  // Diagnostic logging with requestId and sanitized operational context
  const errorMeta = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode,
    requestId: req.id,
    ip: req.ip,
    name: error.name || "Error",
  };

  if (statusCode >= 500) {
    logger.error(`Server Error: ${error.message}`, {
      ...errorMeta,
      stack: error.stack,
    });
  } else {
    logger.warn(`Client Error: ${error.message}`, errorMeta);
  }

  // Never expose sensitive server internals or stack traces in production
  const safeMessage =
    isProduction && statusCode === 500
      ? "Internal server error"
      : error.message || "An unexpected error occurred";

  const responsePayload = {
    success: false,
    message: safeMessage,
    ...(error.details ? { errors: error.details } : {}),
    ...(!isProduction && error.stack && statusCode >= 500
      ? { stack: error.stack }
      : {}),
  };

  return res.status(statusCode).json(responsePayload);
};

export default errorMiddleware;
