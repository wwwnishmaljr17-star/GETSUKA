/**
 * Sanitizes input data by removing keys that start with '$' or contain '.'
 * to prevent MongoDB Query Selector / Operator injection attacks.
 */
export const sanitizeInPlace = (input) => {
  if (!input || typeof input !== "object") {
    return;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      if (item && typeof item === "object") {
        sanitizeInPlace(item);
      }
    }
    return;
  }

  for (const key of Object.keys(input)) {
    if (key.startsWith("$")) {
      delete input[key];
    } else if (input[key] && typeof input[key] === "object") {
      sanitizeInPlace(input[key]);
    }
  }
};

export const mongoSanitizeMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    sanitizeInPlace(req.body);
  }
  if (req.query && typeof req.query === "object") {
    sanitizeInPlace(req.query);
  }
  if (req.params && typeof req.params === "object") {
    sanitizeInPlace(req.params);
  }
  next();
};

export default mongoSanitizeMiddleware;
