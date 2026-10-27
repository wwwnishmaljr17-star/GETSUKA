import AppError from "../utils/AppError.js";

export const notFoundMiddleware = (req, res, next) => {
  next(
    new AppError(
      `Resource not found: ${req.method} ${req.originalUrl || req.url}`,
      404
    )
  );
};

export default notFoundMiddleware;
