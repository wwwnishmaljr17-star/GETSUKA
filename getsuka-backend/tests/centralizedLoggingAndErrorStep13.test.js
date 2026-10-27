import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import express from "express";
import mongoose from "mongoose";

import AppError from "../src/utils/AppError.js";
import asyncHandler from "../src/utils/asyncHandler.js";
import { logger, sanitizeValue } from "../src/utils/logger.js";
import requestLogger from "../src/middlewares/requestLogger.js";
import notFoundMiddleware from "../src/middlewares/notFoundMiddleware.js";
import errorMiddleware from "../src/middlewares/errorMiddleware.js";

describe("Step 13 Centralized Logging and Error Handling Tests", () => {
  let devServer;
  let devBaseUrl;
  let prodServer;
  let prodBaseUrl;

  const createTestApp = (env = "development") => {
    const app = express();
    app.disable("x-powered-by");

    // Mock environment for this app instance
    app.use((req, res, next) => {
      req.testEnv = env;
      next();
    });

    app.use(requestLogger);
    app.use(express.json());

    // 1. Known application error route
    app.get("/test/known-error", (req, res, next) => {
      next(
        AppError.badRequest("Invalid request parameters", [
          { field: "email", message: "Email format is invalid" },
        ])
      );
    });

    // 2. Conflict error route
    app.get("/test/conflict-error", (req, res, next) => {
      next(AppError.conflict("User with this email already registered"));
    });

    // 3. Async controller failure route
    app.get(
      "/test/async-failure",
      asyncHandler(async (req, res) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw new Error("Simulated async operational failure");
      })
    );

    // 4. Mongoose CastError simulation
    app.get("/test/cast-error", (req, res, next) => {
      const castErr = new mongoose.Error.CastError(
        "ObjectId",
        "invalid_id_123",
        "productId"
      );
      next(castErr);
    });

    // 5. Mongoose ValidationError simulation
    app.get("/test/validation-error", (req, res, next) => {
      const valErr = new mongoose.Error.ValidationError();
      valErr.errors = {
        name: { message: "Product name is required" },
        price: { message: "Price must be a positive number" },
      };
      next(valErr);
    });

    // 6. MongoDB Duplicate Key (code 11000) simulation
    app.get("/test/duplicate-key", (req, res, next) => {
      const dupErr = new Error("E11000 duplicate key error");
      dupErr.code = 11000;
      dupErr.keyValue = { email: "test@getsuka.com" };
      next(dupErr);
    });

    // 7. JWT token error simulation
    app.get("/test/jwt-error", (req, res, next) => {
      const jwtErr = new Error("jwt malformed");
      jwtErr.name = "JsonWebTokenError";
      next(jwtErr);
    });

    // 8. Unexpected server internal error (500)
    app.get("/test/unexpected-500", (req, res, next) => {
      next(new Error("Sensitive internal database connection crash"));
    });

    // 9. Standard successful route
    app.get("/test/success", (req, res) => {
      res.status(200).json({ success: true, message: "OK" });
    });

    // 404 and Error Middlewares
    app.use(notFoundMiddleware);

    // Dynamic error middleware taking environment into account
    app.use((err, req, res, next) => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = req.testEnv || env;
      try {
        errorMiddleware(err, req, res, next);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    return app;
  };

  before(async () => {
    // Start development-mode server
    const devApp = createTestApp("development");
    await new Promise((resolve) => {
      devServer = devApp.listen(0, () => {
        devBaseUrl = `http://127.0.0.1:${devServer.address().port}`;
        resolve();
      });
    });

    // Start production-mode server
    const prodApp = createTestApp("production");
    await new Promise((resolve) => {
      prodServer = prodApp.listen(0, () => {
        prodBaseUrl = `http://127.0.0.1:${prodServer.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (devServer) {
      await new Promise((resolve) => devServer.close(resolve));
    }
    if (prodServer) {
      await new Promise((resolve) => prodServer.close(resolve));
    }
  });

  // =========================================================
  // 1. KNOWN OPERATIONAL ERRORS
  // =========================================================
  test("TEST 1: Known operational errors return correct status and safe message format", async () => {
    const res = await fetch(`${devBaseUrl}/test/known-error`);
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Invalid request parameters");
    assert.ok(Array.isArray(body.errors));
    assert.strictEqual(body.errors[0].field, "email");
  });

  test("TEST 2: AppError.conflict returns status 409 with proper message", async () => {
    const res = await fetch(`${devBaseUrl}/test/conflict-error`);
    assert.strictEqual(res.status, 409);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "User with this email already registered");
  });

  // =========================================================
  // 2. UNEXPECTED SERVER ERRORS & PRODUCTION MASKING
  // =========================================================
  test("TEST 3: Unexpected 500 error in development returns message and stack for debugging", async () => {
    const res = await fetch(`${devBaseUrl}/test/unexpected-500`);
    assert.strictEqual(res.status, 500);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Sensitive internal database connection crash");
    assert.ok(body.stack, "Stack trace should be provided in development for debugging");
  });

  test("TEST 4: Unexpected 500 error in production returns generic safe message without stack leakage", async () => {
    const res = await fetch(`${prodBaseUrl}/test/unexpected-500`);
    assert.strictEqual(res.status, 500);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Internal server error");
    assert.strictEqual(body.stack, undefined, "Stack trace must NEVER be exposed in production");
    assert.ok(
      !JSON.stringify(body).includes("Sensitive internal database"),
      "Sensitive database internal message must not leak to client"
    );
  });

  // =========================================================
  // 3. INVALID REQUEST PAYLOADS & MALFORMED JSON
  // =========================================================
  test("TEST 5: Malformed JSON payload is caught by error middleware and returns 400 JSON", async () => {
    const res = await fetch(`${devBaseUrl}/test/success`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ unquoted_bad_json: ",
    });

    assert.strictEqual(res.status, 400);
    const contentType = res.headers.get("content-type");
    assert.ok(contentType.includes("application/json"));

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.toLowerCase().includes("json"));
  });

  test("TEST 6: Mongoose CastError returns 400 Bad Request with formatted identifier message", async () => {
    const res = await fetch(`${devBaseUrl}/test/cast-error`);
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes("productId"));
    assert.ok(body.message.includes("invalid_id_123"));
  });

  test("TEST 7: Mongoose ValidationError returns 400 with aggregated field messages", async () => {
    const res = await fetch(`${devBaseUrl}/test/validation-error`);
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes("Product name is required"));
    assert.ok(body.message.includes("Price must be a positive number"));
  });

  test("TEST 8: MongoDB duplicate key error returns 409 Conflict with field information", async () => {
    const res = await fetch(`${devBaseUrl}/test/duplicate-key`);
    assert.strictEqual(res.status, 409);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes("email"));
  });

  // =========================================================
  // 4. AUTHENTICATION ERRORS
  // =========================================================
  test("TEST 9: JsonWebTokenError is normalized to 401 Unauthorized", async () => {
    const res = await fetch(`${devBaseUrl}/test/jwt-error`);
    assert.strictEqual(res.status, 401);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Invalid authentication token");
  });

  // =========================================================
  // 5. UNKNOWN ROUTES (404 HANDLING)
  // =========================================================
  test("TEST 10: Unknown route returns 404 JSON response instead of default HTML", async () => {
    const res = await fetch(`${devBaseUrl}/api/non-existent-endpoint-${Date.now()}`);
    assert.strictEqual(res.status, 404);

    const contentType = res.headers.get("content-type");
    assert.ok(contentType.includes("application/json"));

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes("Resource not found"));
  });

  // =========================================================
  // 6. ASYNC CONTROLLER FAILURE FORWARDING
  // =========================================================
  test("TEST 11: Async controller rejection is safely routed to error middleware without server crash", async () => {
    const res = await fetch(`${devBaseUrl}/test/async-failure`);
    assert.strictEqual(res.status, 500);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes("Simulated async operational failure"));
  });

  // =========================================================
  // 7. REQUEST CORRELATION & TRACING
  // =========================================================
  test("TEST 12: Request logger attaches X-Request-Id correlation header to responses", async () => {
    const res = await fetch(`${devBaseUrl}/test/success`);
    assert.strictEqual(res.status, 200);

    const requestId = res.headers.get("x-request-id");
    assert.ok(requestId, "Response must include X-Request-Id header");
    assert.ok(requestId.length > 5, "X-Request-Id must be a valid correlation ID string");
  });

  test("TEST 13: Incoming X-Request-Id is preserved across the request lifecycle", async () => {
    const customId = "trace-client-order-987654";
    const res = await fetch(`${devBaseUrl}/test/success`, {
      headers: { "X-Request-Id": customId },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("x-request-id"), customId);
  });

  // =========================================================
  // 8. LOGGING REDACTION FOR SENSITIVE VALUES
  // =========================================================
  test("TEST 14: Sensitive keys (passwords, tokens, OTPs, secrets) are redacted from logs", () => {
    const rawData = {
      email: "user@getsuka.com",
      password: "SuperSecretPassword123!",
      token: "secret_token_1234567890",
      otp: "847291",
      razorpay_signature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      user: {
        currentPassword: "OldPassword!",
        adminToken: "admin_jwt_value",
      },
      tags: ["clothing", "anime"],
    };

    const sanitized = sanitizeValue("", rawData);

    assert.strictEqual(sanitized.email, "user@getsuka.com");
    assert.strictEqual(sanitized.password, "[REDACTED]");
    assert.strictEqual(sanitized.token, "[REDACTED]");
    assert.strictEqual(sanitized.otp, "[REDACTED]");
    assert.strictEqual(sanitized.razorpay_signature, "[REDACTED]");
    assert.strictEqual(sanitized.user.currentPassword, "[REDACTED]");
    assert.strictEqual(sanitized.user.adminToken, "[REDACTED]");
    assert.deepStrictEqual(sanitized.tags, ["clothing", "anime"]);
  });

  test("TEST 15: String-level Bearer tokens and JWTs are sanitized in log outputs", () => {
    const bearerStr = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.abc";
    const sanitizedBearer = sanitizeValue("authHeader", bearerStr);
    assert.strictEqual(sanitizedBearer, "Bearer [REDACTED]");

    const rawJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const sanitizedJwt = sanitizeValue("customField", rawJwt);
    assert.strictEqual(sanitizedJwt, "[REDACTED_JWT]");
  });

  test("TEST 16: Circular references in metadata do not cause recursion crashes", () => {
    const circularObj = { name: "Order Context" };
    circularObj.self = circularObj;

    const sanitized = sanitizeValue("", circularObj);
    assert.strictEqual(sanitized.name, "Order Context");
    assert.strictEqual(sanitized.self, "[Circular]");
  });
});
