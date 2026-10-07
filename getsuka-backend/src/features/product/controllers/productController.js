import Product from "../models/Product.js";
import Category from "../../category/models/Category.js";

/* =========================================
   HELPER
========================================= */

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getTotalStock = (product) => {
  if (!Array.isArray(product.variants)) {
    return 0;
  }

  return product.variants.reduce((total, variant) => {
    return total + Number(variant.stock || 0);
  }, 0);
};

/* =========================================
   ADD PRODUCT
========================================= */

export const addProduct = async (req, res) => {
  try {
    const {
      name,
      productCode,
      description,
      category,
      anime,
      images,
      price,
      salePrice,
      variants,
    } = req.body;

    const normalizedProductCode =
      typeof productCode === "string" ? productCode.trim() : "";

    const normalizedDetails = {
      material:
        typeof req.body.details?.material === "string"
          ? req.body.details.material.trim()
          : "",

      fit:
        typeof req.body.details?.fit === "string"
          ? req.body.details.fit.trim()
          : "",

      careInstructions:
        typeof req.body.details?.careInstructions === "string"
          ? req.body.details.careInstructions.trim()
          : "",

      shippingInfo:
        typeof req.body.details?.shippingInfo === "string"
          ? req.body.details.shippingInfo.trim()
          : "",

      returnInfo:
        typeof req.body.details?.returnInfo === "string"
          ? req.body.details.returnInfo.trim()
          : "",

      productDetails:
        typeof req.body.details?.productDetails === "string"
          ? req.body.details.productDetails.trim()
          : "",

      highlights: Array.isArray(req.body.details?.highlights)
        ? req.body.details.highlights
            .map((item) => String(item).trim())
            .filter(Boolean)
        : [],
    };

    /* =====================================
       BASIC VALIDATION
    ===================================== */

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product description is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!anime || !anime.trim()) {
      return res.status(400).json({
        success: false,
        message: "Anime is required",
      });
    }

    if (!Array.isArray(images) || images.length < 3) {
      return res.status(400).json({
        success: false,
        message: "At least 3 product images are required",
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      Number.isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid product price is required",
      });
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product variant is required",
      });
    }

    /* =====================================
       CHECK CATEGORY
    ===================================== */

    let existingCategory = null;

    if (typeof category === "string") {
      existingCategory = await Category.findOne({
        _id: category,
        isDeleted: false,
      }).catch(() => null);

      if (!existingCategory) {
        existingCategory = await Category.findOne({
          name: {
            $regex: `^${escapeRegex(category.trim())}$`,
            $options: "i",
          },
          isDeleted: false,
        });
      }
    }

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    /* =====================================
       VALIDATE VARIANTS
    ===================================== */

    for (const variant of variants) {
      if (!variant.color || !variant.color.trim()) {
        return res.status(400).json({
          success: false,
          message: "Variant color is required",
        });
      }

      if (!variant.size || !variant.size.trim()) {
        return res.status(400).json({
          success: false,
          message: "Variant size is required",
        });
      }

      if (!variant.sku || !variant.sku.trim()) {
        return res.status(400).json({
          success: false,
          message: "Variant SKU is required",
        });
      }

      if (
        variant.stock === undefined ||
        variant.stock === null ||
        variant.stock === "" ||
        Number.isNaN(Number(variant.stock)) ||
        Number(variant.stock) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Variant stock cannot be negative",
        });
      }
    }

    /* =====================================
       CHECK DUPLICATE SKU
    ===================================== */

    const skus = variants.map((variant) => variant.sku.trim());

    const uniqueSkus = new Set(skus);

    if (uniqueSkus.size !== skus.length) {
      return res.status(409).json({
        success: false,
        message: "Duplicate SKU found in variants",
      });
    }

    /* =====================================
       CHECK DUPLICATES IN PARALLEL
    ===================================== */

    const [existingProductCode, existingSku] =
      await Promise.all([
        normalizedProductCode
          ? Product.findOne({
              productCode: normalizedProductCode,
              isDeleted: false,
            })
              .select("_id")
              .lean()
          : null,

        Product.findOne({
          "variants.sku": {
            $in: skus,
          },
          isDeleted: false,
        })
          .select("_id")
          .lean(),
      ]);

    if (existingProductCode) {
      return res.status(409).json({
        success: false,
        message: "Product code already exists",
      });
    }

    if (existingSku) {
      return res.status(409).json({
        success: false,
        message: "One or more SKU already exists",
      });
    }

    /* =====================================
       SALE PRICE VALIDATION
    ===================================== */

    if (
      salePrice !== undefined &&
      salePrice !== null &&
      salePrice !== ""
    ) {
      if (
        Number.isNaN(Number(salePrice)) ||
        Number(salePrice) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Sale price cannot be negative",
        });
      }

      if (Number(salePrice) > Number(price)) {
        return res.status(400).json({
          success: false,
          message:
            "Sale price cannot be greater than regular price",
        });
      }
    }

    /* =====================================
       CREATE PRODUCT
    ===================================== */

    const product = await Product.create({
      name: name.trim(),

      productCode: normalizedProductCode || undefined,

      description: description.trim(),

      category: existingCategory._id,

      anime: anime.trim(),

      images,

      price: Number(price),

      salePrice:
        salePrice === undefined ||
        salePrice === null ||
        salePrice === ""
          ? null
          : Number(salePrice),

      variants: variants.map((variant) => ({
        color: variant.color.trim(),

        size: variant.size.trim(),

        sku: variant.sku.trim(),

        stock: Number(variant.stock),
      })),

      details: normalizedDetails,

      isListed: true,

      isDeleted: false,
    });

    /* =====================================
       PREPARE RESPONSE WITHOUT EXTRA QUERY
    ===================================== */

    const productObject = product.toObject();

    productObject.category = {
      _id: existingCategory._id,
      name: existingCategory.name,
    };

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      product: productObject,
    });
  } catch (error) {
    console.error("Add Product Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add product",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =========================================
   GET PRODUCTS
   SEARCH
   PAGINATION
   SORTING
   CATEGORY
   ANIME
   STATUS
========================================= */

export const getProducts = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      sort = "name-az",
      anime = "",
      category = "",
      status = "",
    } = req.query;

    const currentPage = Math.max(
      parseInt(page, 10) || 1,
      1
    );

    const productsPerPage = Math.max(
      parseInt(limit, 10) || 10,
      1
    );

    const searchText = String(search).trim();

    /* =====================================
       BASE FILTER
    ===================================== */

    const filter = {
      isDeleted: false,
    };

    // const prod=Product.find();
    // console.log(prod)

    /* =====================================
       SEARCH
    ===================================== */

    if (searchText) {
      const safeSearch = escapeRegex(searchText);

      filter.$or = [
        {
          name: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          anime: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          "variants.sku": {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    /* =====================================
       ANIME FILTER
    ===================================== */

    if (anime && String(anime).trim()) {
      filter.anime = {
        $regex: `^${escapeRegex(
          String(anime).trim()
        )}$`,
        $options: "i",
      };
    }

    /* =====================================
       CATEGORY FILTER

       Supports:
       1. Category ObjectId
       2. Category name
    ===================================== */

    if (
      category &&
      String(category).trim() &&
      String(category).trim() !== "all"
    ) {
      const categoryValue = String(category).trim();

      let categoryDocument = null;

      categoryDocument = await Category.findOne({
        name: {
          $regex: `^${escapeRegex(categoryValue)}$`,
          $options: "i",
        },
        isDeleted: false,
      }).select("_id");

      if (!categoryDocument) {
        categoryDocument = await Category.findOne({
          _id: categoryValue,
          isDeleted: false,
        })
          .select("_id")
          .catch(() => null);
      }

      if (!categoryDocument) {
        return res.status(200).json({
          success: true,
          products: [],
          pagination: {
            currentPage,
            productsPerPage,
            totalProducts: 0,
            totalPages: 0,
          },
        });
      }

      filter.category = categoryDocument._id;
    }

    /* =====================================
       STATUS FILTER
    ===================================== */

    if (status && String(status).trim()) {
      const currentStatus = String(status)
        .trim()
        .toLowerCase();

      switch (currentStatus) {
        case "active":
          filter.isListed = true;
          break;

        case "unlisted":
          filter.isListed = false;
          break;

        case "out-of-stock":
        case "outofstock":
          filter.variants = {
            $not: {
              $elemMatch: {
                stock: {
                  $gt: 0,
                },
              },
            },
          };
          break;

        case "low-stock":
        case "lowstock":
          filter.variants = {
            $elemMatch: {
              stock: {
                $gt: 0,
                $lte: 5,
              },
            },
          };
          break;

        case "all":
        case "status":
        default:
          break;
      }
    }

    /* =====================================
       SORTING
    ===================================== */

    let sortOption = {
      createdAt: -1,
    };

    switch (sort) {
      case "name-az":
        sortOption = {
          price: 1,
        };
        break;

      case "price-high":
        sortOption = {
          price: -1,
        };
        break;

      case "name-a":
        sortOption = {
          name: 1,
        };
        break;

      case "name-za":
        sortOption = {
          name: -1,
        };
        break;

      case "oldest":
        sortOption = {
          createdAt: 1,
        };
        break;

      case "newest":
      default:
        sortOption = {
          createdAt: -1,
        };
        break;
    }

    /* =====================================
       TOTAL
    ===================================== */

    const totalProducts =
      await Product.countDocuments(filter);

    const totalPages = Math.ceil(
      totalProducts / productsPerPage
    );

    /* =====================================
       PRODUCTS
    ===================================== */

    const products = await Product.find(filter)
      .populate("category", "name")
      .sort(sortOption)
      .skip(
        (currentPage - 1) *
          productsPerPage
      )
      .limit(productsPerPage)
      .lean();

    ///////////////////////////////////////////////////////////////////////////////////
    /* =====================================
       ADD STOCK INFORMATION
    ===================================== */

    const formattedProducts = products.map(
      (product) => {
        const totalStock = getTotalStock(product);

        let stockStatus = "ACTIVE";

        if (totalStock === 0) {
          stockStatus = "OUT_OF_STOCK";
        } else if (totalStock <= 5) {
          stockStatus = "LOW_STOCK";
        } else if (!product.isListed) {
          stockStatus = "UNLISTED";
        }

        return {
          ...product,

          totalStock,

          stockStatus,

          variantCount: Array.isArray(
            product.variants
          )
            ? product.variants.length
            : 0,
        };
      }
    );

    return res.status(200).json({
      success: true,

      products: formattedProducts,

      pagination: {
        currentPage,
        productsPerPage,
        totalProducts,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get Products Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =========================================
   GET SINGLE PRODUCT
========================================= */

export const getProductById = async (
  req,
  res
) => {
  try {
    const { productId } = req.params;

    const product =
      await Product.findOne({
        _id: productId,
        isDeleted: false,
        isListed: true,
      }).populate(
        "category",
        "name"
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const productObject =
      product.toObject();

    productObject.totalStock =
      getTotalStock(productObject);

    productObject.variantCount =
      Array.isArray(productObject.variants)
        ? productObject.variants.length
        : 0;

    return res.status(200).json({
      success: true,
      product: productObject,
    });
  } catch (error) {
    console.error(
      "Get Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

/* =========================================
   UPDATE PRODUCT
========================================= */

export const updateProduct = async (
  req,
  res
) => {
  try {
    const { productId } = req.params;

    const {
      name,
      productCode,
      description,
      category,
      anime,
      images,
      price,
      salePrice,
      variants,
    } = req.body;

    /* =====================================
       FIND PRODUCT
    ===================================== */

    const product =
      await Product.findOne({
        _id: productId,
        isDeleted: false,
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const normalizedProductCode =
      typeof productCode === "string"
        ? productCode.trim()
        : "";

    const normalizedDetails = {
      material:
        typeof req.body.details?.material === "string"
          ? req.body.details.material.trim()
          : "",

      fit:
        typeof req.body.details?.fit === "string"
          ? req.body.details.fit.trim()
          : "",

      careInstructions:
        typeof req.body.details?.careInstructions === "string"
          ? req.body.details.careInstructions.trim()
          : "",

      shippingInfo:
        typeof req.body.details?.shippingInfo === "string"
          ? req.body.details.shippingInfo.trim()
          : "",

      returnInfo:
        typeof req.body.details?.returnInfo === "string"
          ? req.body.details.returnInfo.trim()
          : "",

      productDetails:
        typeof req.body.details?.productDetails === "string"
          ? req.body.details.productDetails.trim()
          : "",

      highlights: Array.isArray(req.body.details?.highlights)
        ? req.body.details.highlights
            .map((item) => String(item).trim())
            .filter(Boolean)
        : [],
    };

    /* =====================================
       BASIC VALIDATION
    ===================================== */

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product description is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!anime || !anime.trim()) {
      return res.status(400).json({
        success: false,
        message: "Anime is required",
      });
    }

    if (!Array.isArray(images) || images.length < 3) {
      return res.status(400).json({
        success: false,
        message:
          "At least 3 product images are required",
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      Number.isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid product price is required",
      });
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "At least one product variant is required",
      });
    }

    /* =====================================
       CHECK CATEGORY
    ===================================== */

    let existingCategory = null;

    if (typeof category === "string") {
      existingCategory = await Category.findOne({
        _id: category,
        isDeleted: false,
      }).catch(() => null);

      if (!existingCategory) {
        existingCategory = await Category.findOne({
          name: {
            $regex: `^${escapeRegex(category.trim())}$`,
            $options: "i",
          },
          isDeleted: false,
        });
      }
    }

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    /* =====================================
       VALIDATE VARIANTS
    ===================================== */

    for (const variant of variants) {
      if (!variant.color || !variant.color.trim()) {
        return res.status(400).json({
          success: false,
          message: "Variant color is required",
        });
      }

      if (!variant.size || !variant.size.trim()) {
        return res.status(400).json({
          success: false,
          message: "Variant size is required",
        });
      }

      if (!variant.sku || !variant.sku.trim()) {
        return res.status(400).json({
          success: false,
          message: "Variant SKU is required",
        });
      }

      if (
        variant.stock === undefined ||
        variant.stock === null ||
        variant.stock === "" ||
        Number.isNaN(Number(variant.stock)) ||
        Number(variant.stock) < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Variant stock cannot be negative",
        });
      }
    }

    /* =====================================
       CHECK DUPLICATE PRODUCT CODE
    ===================================== */

    if (normalizedProductCode) {
      const existingProductCode = await Product.findOne({
        productCode: normalizedProductCode,
        _id: { $ne: productId },
        isDeleted: false,
      });

      if (existingProductCode) {
        return res.status(409).json({
          success: false,
          message: "Product code already exists",
        });
      }
    }

    /* =====================================
       CHECK DUPLICATE SKU
    ===================================== */

    const skus = variants.map((variant) =>
      variant.sku.trim()
    );

    const uniqueSkus = new Set(skus);

    if (uniqueSkus.size !== skus.length) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate SKU found in variants",
      });
    }

    const existingSku =
      await Product.findOne({
        _id: {
          $ne: productId,
        },

        "variants.sku": {
          $in: skus,
        },

        isDeleted: false,
      });

    if (existingSku) {
      return res.status(409).json({
        success: false,
        message:
          "One or more SKU already exists",
      });
    }

    /* =====================================
       SALE PRICE
    ===================================== */

    if (
      salePrice !== undefined &&
      salePrice !== null &&
      salePrice !== ""
    ) {
      if (
        Number.isNaN(Number(salePrice)) ||
        Number(salePrice) < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sale price cannot be negative",
        });
      }

      if (
        Number(salePrice) >
        Number(price)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sale price cannot be greater than regular price",
        });
      }
    }

    /* =====================================
       UPDATE
    ===================================== */

    product.name = name.trim();

    product.productCode =
      normalizedProductCode || undefined;

    product.description =
      description.trim();

    product.category =
      existingCategory._id;

    product.anime =
      anime.trim();

    product.images =
      images;

    product.price =
      Number(price);

    product.salePrice =
      salePrice === undefined ||
      salePrice === null ||
      salePrice === ""
        ? null
        : Number(salePrice);

    product.variants =
      variants.map(
        (variant) => ({
          color:
            variant.color.trim(),

          size:
            variant.size.trim(),

          sku:
            variant.sku.trim(),

          stock:
            Number(variant.stock),
        })
      );

    product.details =
      normalizedDetails;

    await product.save();

    const populatedProduct =
      await Product.findById(
        product._id
      ).populate(
        "category",
        "name"
      );

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully",
      product:
        populatedProduct,
    });
  } catch (error) {
    console.error(
      "Update Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update product",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =========================================
   UPDATE VARIANT STOCK
========================================= */

export const updateVariantStock = async (
  req,
  res
) => {
  try {
    const {
      productId,
      variantId,
    } = req.params;

    const { stock } = req.body;

    /* =====================================
       VALIDATE STOCK
    ===================================== */

    if (
      stock === undefined ||
      stock === null ||
      stock === "" ||
      Number.isNaN(Number(stock)) ||
      !Number.isInteger(Number(stock)) ||
      Number(stock) < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock must be a non-negative whole number",
      });
    }

    /* =====================================
       FIND PRODUCT
    ===================================== */

    const product =
      await Product.findOne({
        _id: productId,
        isDeleted: false,
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /* =====================================
       FIND VARIANT
    ===================================== */

    const variant =
      product.variants.id(variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message:
          "Product variant not found",
      });
    }

    /* =====================================
       UPDATE STOCK
    ===================================== */

    variant.stock = Number(stock);

    await product.save();

    /* =====================================
       CALCULATE STOCK INFORMATION
    ===================================== */

    const totalStock =
      getTotalStock(product);

    let stockStatus = "ACTIVE";

    if (totalStock === 0) {
      stockStatus = "OUT_OF_STOCK";
    } else if (totalStock <= 5) {
      stockStatus = "LOW_STOCK";
    } else if (!product.isListed) {
      stockStatus = "UNLISTED";
    }

    /* =====================================
       RESPONSE
    ===================================== */

    return res.status(200).json({
      success: true,
      message:
        "Variant stock updated successfully",

      product: {
        ...product.toObject(),

        totalStock,

        stockStatus,

        variantCount: Array.isArray(
          product.variants
        )
          ? product.variants.length
          : 0,
      },
    });
  } catch (error) {
    console.error(
      "Update Variant Stock Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update variant stock",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/* =========================================
   SOFT DELETE PRODUCT
========================================= */

export const deleteProduct = async (
  req,
  res
) => {
  try {
    const { productId } =
      req.params;

    const product =
      await Product.findOne({
        _id: productId,
        isDeleted: false,
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    product.isDeleted =
      true;

    await product.save();

    return res.status(200).json({
      success: true,
      message:
        "Product deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Product Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete product",
    });
  }
};

/* =========================================
   TOGGLE PRODUCT LISTING
========================================= */

export const toggleProductListing =
  async (req, res) => {
    try {
      const { productId } =
        req.params;

      const product =
        await Product.findOne({
          _id: productId,
          isDeleted: false,
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      product.isListed =
        !product.isListed;

      await product.save();

      return res.status(200).json({
        success: true,

        message:
          product.isListed
            ? "Product listed successfully"
            : "Product unlisted successfully",

        product,
      });
    } catch (error) {
      console.error(
        "Toggle Product Listing Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update product listing",
      });
    }
  };