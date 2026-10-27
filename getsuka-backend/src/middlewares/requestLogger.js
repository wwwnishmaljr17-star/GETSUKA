import crypto from "crypto";
import logger from "../utils/logger.js";

export const requestLogger = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number((endTime - startTime) / 1_000_000n);

    // Skip verbose logs for frequent health checks when successful
    if (req.originalUrl === "/health" && res.statusCode === 200) {
      return;
    }

    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      requestId,
      ip: req.ip || req.socket?.remoteAddress,
    };

    const message = `${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${durationMs}ms [${requestId}]`;

    if (res.statusCode >= 500) {
      logger.error(message, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(message, logData);
    } else {
      logger.info(message, logData);
    }
  });

  next();
};

export default requestLogger;
