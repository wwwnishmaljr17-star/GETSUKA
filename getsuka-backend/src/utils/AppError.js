export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    if (details) {
      this.details = details;
    }
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", details = null) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(message, 401);
  }

  static forbidden(message = "Access forbidden") {
    return new AppError(message, 403);
  }

  static notFound(message = "Resource not found") {
    return new AppError(message, 404);
  }

  static conflict(message = "Resource conflict") {
    return new AppError(message, 409);
  }

  static internal(message = "Internal server error") {
    return new AppError(message, 500);
  }
}

export default AppError;
