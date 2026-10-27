import cloudinary from "../config/cloudinary.js";
import AppError from "../utils/AppError.js";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Validates file buffer magic bytes to prevent executable / polyglot injection
 * Allowed signatures:
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
 */
export const validateImageBuffer = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new AppError("Invalid image buffer", 400);
  }

  if (buffer.length === 0) {
    throw new AppError("Uploaded image file is empty", 400);
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new AppError("Image size exceeds the maximum limit of 5MB", 400);
  }

  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  const isWebp =
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.toString("ascii", 8, 12) === "WEBP";

  if (!isJpeg && !isPng && !isWebp) {
    throw new AppError(
      "Only JPEG, PNG, and WebP image files with valid image headers are allowed",
      400
    );
  }

  return true;
};

/**
 * Uploads an image buffer to Cloudinary using upload_stream
 */
export const uploadImageBuffer = async (buffer, options = {}) => {
  validateImageBuffer(buffer);

  const uploadOptions = {
    folder: "getsuka/products",
    resource_type: "image",
    allowed_formats: ["jpg", "png", "webp", "jpeg"],
    ...options,
  };

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(new AppError(`Cloudinary upload failed: ${error.message}`, 502));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            bytes: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
          });
        }
      }
    );

    stream.end(buffer);
  });
};

/**
 * Uploads a Base64 data URL to Cloudinary
 */
export const uploadBase64Image = async (base64String, options = {}) => {
  if (typeof base64String !== "string" || !base64String.startsWith("data:image/")) {
    throw new AppError("Invalid Base64 image format", 400);
  }

  const matches = base64String.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches) {
    throw new AppError("Malformed Base64 image data URL", 400);
  }

  // Check approximate decoded size: 4 base64 chars = 3 bytes
  const base64Data = matches[2];
  const approximateBytes = Math.ceil((base64Data.length * 3) / 4);
  if (approximateBytes > MAX_IMAGE_SIZE_BYTES) {
    throw new AppError("Base64 image exceeds 5MB size limit", 400);
  }

  const uploadOptions = {
    folder: "getsuka/products",
    resource_type: "image",
    allowed_formats: ["jpg", "png", "webp", "jpeg"],
    ...options,
  };

  try {
    const result = await cloudinary.uploader.upload(base64String, uploadOptions);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format,
    };
  } catch (error) {
    throw new AppError(`Failed to upload image to storage service: ${error.message}`, 502);
  }
};

/**
 * Extracts Cloudinary public_id from a secure URL
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== "string") {
    return null;
  }
  // Matches e.g. https://res.cloudinary.com/cloud/image/upload/v12345/getsuka/products/abc.jpg -> getsuka/products/abc
  const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
  return match ? match[1] : null;
};

/**
 * Deletes an image from Cloudinary by publicId or URL
 */
export const deleteImage = async (publicIdOrUrl) => {
  if (!publicIdOrUrl || typeof publicIdOrUrl !== "string") {
    throw new AppError("Image identifier is required for deletion", 400);
  }

  const publicId = publicIdOrUrl.startsWith("http")
    ? extractPublicIdFromUrl(publicIdOrUrl)
    : publicIdOrUrl;

  if (!publicId) {
    throw new AppError("Could not determine image storage identifier", 400);
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new AppError(`Failed to delete image: ${error.message}`, 502);
  }
};

/**
 * Checks if a string is a Base64 image data URL
 */
export const isBase64Image = (str) => {
  if (typeof str !== "string") return false;
  return str.startsWith("data:image/") || str.startsWith("data:");
};

/**
 * Validates whether an image string is an allowed URL or storage reference
 */
export const isValidImageUrl = (str) => {
  if (typeof str !== "string" || !str.trim()) return false;
  if (isBase64Image(str)) return false;
  return true;
};
