import {
  uploadImageBuffer,
  deleteImage,
  extractPublicIdFromUrl,
} from "../../../services/imageService.js";
import AppError from "../../../utils/AppError.js";

/**
 * Upload a single product image to Cloudinary
 */
export const uploadSingleImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const result = await uploadImageBuffer(req.file.buffer, {
      folder: "getsuka/products",
    });

    return res.status(200).json({
      success: true,
      url: result.url,
      publicId: result.publicId,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload multiple product images to Cloudinary in batch
 * With automatic rollback if any file in the batch fails
 */
export const uploadMultipleImages = async (req, res, next) => {
  const uploadedPublicIds = [];
  try {
    const files = req.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No image files provided",
      });
    }

    if (files.length > 6) {
      return res.status(400).json({
        success: false,
        message: "A maximum of 6 images can be uploaded at a time",
      });
    }

    const results = [];
    for (const file of files) {
      const result = await uploadImageBuffer(file.buffer, {
        folder: "getsuka/products",
      });
      uploadedPublicIds.push(result.publicId);
      results.push(result);
    }

    return res.status(200).json({
      success: true,
      urls: results.map((r) => r.url),
      images: results.map((r) => ({
        url: r.url,
        publicId: r.publicId,
      })),
      message: "Images uploaded successfully",
    });
  } catch (error) {
    // Rollback already uploaded images from this batch to avoid orphaned files
    if (uploadedPublicIds.length > 0) {
      await Promise.allSettled(
        uploadedPublicIds.map((publicId) => deleteImage(publicId))
      );
    }
    next(error);
  }
};

/**
 * Delete a product image from Cloudinary
 */
export const deleteProductImage = async (req, res, next) => {
  try {
    const { publicId, url } = req.body;
    const identifier = publicId || url;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Image publicId or url is required",
      });
    }

    await deleteImage(identifier);

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
