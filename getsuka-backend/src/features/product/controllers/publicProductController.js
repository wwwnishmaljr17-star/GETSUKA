import mongoose from "mongoose";

import Product from "../models/Product.js";
import Category from "../../category/models/Category.js";

// =========================================================
// GET PUBLIC PRODUCTS
// =========================================================

export const getPublicProducts = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      anime = "",
      minPrice = "",
      maxPrice = "",
      size = "",
      color = "",
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    // =======================================================
    // PAGINATION
    // =======================================================

    const currentPage = Math.max(Number(page) || 1, 1);

    const perPage = Math.min(
      Math.max(Number(limit) || 12, 1),
      48
    );

    const skip = (currentPage - 1) * perPage;

    // =======================================================
    // BASE FILTER
    // =======================================================

    const filter = {
      isDeleted: false,
      isListed: true,
    };

    // =======================================================
    // SEARCH
    // =======================================================

    const cleanSearch = String(search).trim();

    if (cleanSearch) {
      const searchRegex = new RegExp(
        escapeRegex(cleanSearch),
        "i"
      );

      filter.$or = [
        {
          name: searchRegex,
        },
        {
          anime: searchRegex,
        },
        {
          "variants.sku": searchRegex,
        },
      ];
    }

    // =======================================================
    // ANIME FILTER
    // =======================================================

    const cleanAnime = String(anime).trim();

    if (cleanAnime) {
      filter.anime = new RegExp(
        `^${escapeRegex(cleanAnime)}$`,
        "i"
      );
    }

    // =======================================================
    // CATEGORY FILTER
    // =======================================================

    const cleanCategory = String(category).trim();

    if (cleanCategory) {
      if (mongoose.Types.ObjectId.isValid(cleanCategory)) {
        filter.category = cleanCategory;
      } else {
        const categoryDocument = await Category.findOne({
          name: new RegExp(
            `^${escapeRegex(cleanCategory)}$`,
            "i"
          ),
          isDeleted: false,
        }).lean();

        if (!categoryDocument) {
          return res.status(200).json({
            success: true,
            message: "Products fetched successfully.",
            products: [],
            pagination: {
              currentPage,
              totalPages: 0,
              totalProducts: 0,
              perPage,
              hasNextPage: false,
              hasPreviousPage: currentPage > 1,
            },
          });
        }

        filter.category = categoryDocument._id;
      }
    }

    // =======================================================
    // SIZE FILTER
    // =======================================================

    const cleanSize = String(size).trim();

    if (cleanSize) {
      filter.variants = {
        $elemMatch: {
          size: new RegExp(
            `^${escapeRegex(cleanSize)}$`,
            "i"
          ),
          stock: {
            $gt: 0,
          },
        },
      };
    }

    // =======================================================
    // COLOR FILTER
    // =======================================================

    const cleanColor = String(color).trim();

    if (cleanColor) {
      const colorCondition = {
        color: new RegExp(
          `^${escapeRegex(cleanColor)}$`,
          "i"
        ),
        stock: {
          $gt: 0,
        },
      };

      if (filter.variants?.$elemMatch) {
        filter.variants = {
          $elemMatch: {
            size: filter.variants.$elemMatch.size,
            color: colorCondition.color,
            stock: {
              $gt: 0,
            },
          },
        };
      } else {
        filter.variants = {
          $elemMatch: colorCondition,
        };
      }
    }

    // =======================================================
    // PRICE FILTER
    //
    // ACTUAL SELLING PRICE:
    //
    // If salePrice exists AND is lower than price:
    //     use salePrice
    //
    // Otherwise:
    //     use regular price
    //
    // Example:
    //
    // price     = 3599
    // salePrice = 2999
    //
    // MAX PRICE = 3000
    // => SHOW PRODUCT
    //
    // MAX PRICE = 2000
    // => HIDE PRODUCT
    // =======================================================

    const hasMinPrice =
      minPrice !== "" &&
      minPrice !== undefined &&
      minPrice !== null;

    const hasMaxPrice =
      maxPrice !== "" &&
      maxPrice !== undefined &&
      maxPrice !== null;

    const parsedMinPrice = hasMinPrice
      ? Number(minPrice)
      : null;

    const parsedMaxPrice = hasMaxPrice
      ? Number(maxPrice)
      : null;

    if (
      hasMinPrice &&
      !Number.isFinite(parsedMinPrice)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid minimum price.",
      });
    }

    if (
      hasMaxPrice &&
      !Number.isFinite(parsedMaxPrice)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid maximum price.",
      });
    }

    if (
      hasMinPrice &&
      parsedMinPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Minimum price cannot be negative.",
      });
    }

    if (
      hasMaxPrice &&
      parsedMaxPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum price cannot be negative.",
      });
    }

    if (
      hasMinPrice &&
      hasMaxPrice &&
      parsedMinPrice > parsedMaxPrice
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimum price cannot be greater than maximum price.",
      });
    }

    /*
      Use MongoDB $expr so the filter compares against
      the actual selling price.

      Valid sale price:
        salePrice exists
        salePrice is not null
        salePrice is lower than regular price

      Otherwise:
        use regular price.
    */

    if (hasMinPrice || hasMaxPrice) {
      const effectivePriceExpression = {
        $cond: [
          {
            $and: [
              {
                $ne: [
                  {
                    $ifNull: ["$salePrice", null],
                  },
                  null,
                ],
              },
              {
                $lt: [
                  "$salePrice",
                  "$price",
                ],
              },
            ],
          },
          "$salePrice",
          "$price",
        ],
      };

      const priceConditions = [];

      if (hasMinPrice) {
        priceConditions.push({
          $gte: [
            effectivePriceExpression,
            parsedMinPrice,
          ],
        });
      }

      if (hasMaxPrice) {
        priceConditions.push({
          $lte: [
            effectivePriceExpression,
            parsedMaxPrice,
          ],
        });
      }

      filter.$expr =
        priceConditions.length === 1
          ? priceConditions[0]
          : {
              $and: priceConditions,
            };
    }

    // =======================================================
    // SORTING
    // =======================================================

    let sortOption = {
      createdAt: -1,
    };

    switch (String(sort).toLowerCase()) {
      case "price-low":
      case "price-low-to-high":
      case "low-high":
        sortOption = {
          price: 1,
          createdAt: -1,
        };
        break;

      case "price-high":
      case "price-high-to-low":
      case "high-low":
        sortOption = {
          price: -1,
          createdAt: -1,
        };
        break;

      case "a-z":
      case "name-az":
        sortOption = {
          name: 1,
          createdAt: -1,
        };
        break;

      case "z-a":
      case "name-za":
        sortOption = {
          name: -1,
          createdAt: -1,
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

    // =======================================================
    // FETCH PRODUCTS + COUNT
    // =======================================================

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .populate({
          path: "category",
          select: "name",
        })
        .sort(sortOption)
        .skip(skip)
        .limit(perPage)
        .lean(),

      Product.countDocuments(filter),
    ]);

    // =======================================================
    // FORMAT PRODUCTS
    // =======================================================

    const formattedProducts = products.map((product) => {
      const variants = Array.isArray(product.variants)
        ? product.variants
        : [];

      const totalStock = variants.reduce(
        (total, variant) => {
          return total + Number(variant.stock || 0);
        },
        0
      );

      const availableVariants = variants.filter(
        (variant) => Number(variant.stock || 0) > 0
      );

      const sizes = [
        ...new Set(
          variants
            .map((variant) => variant.size)
            .filter(Boolean)
        ),
      ];

      const colors = [
        ...new Set(
          variants
            .map((variant) => variant.color)
            .filter(Boolean)
        ),
      ];

      let stockStatus = "IN_STOCK";

      if (totalStock === 0) {
        stockStatus = "OUT_OF_STOCK";
      } else if (totalStock <= 5) {
        stockStatus = "LOW_STOCK";
      }

      const hasValidSalePrice =
        product.salePrice !== null &&
        product.salePrice !== undefined &&
        Number(product.salePrice) <
          Number(product.price);

      const finalPrice = hasValidSalePrice
        ? Number(product.salePrice)
        : Number(product.price);

      return {
        _id: product._id,
        name: product.name,
        description: product.description,

        category: product.category
          ? {
              _id: product.category._id,
              name: product.category.name,
            }
          : null,

        anime: product.anime,

        images: product.images || [],

        price: product.price,

        salePrice:
          product.salePrice !== null &&
          product.salePrice !== undefined
            ? product.salePrice
            : null,

        finalPrice,

        variants: variants.map((variant) => ({
          _id: variant._id,
          color: variant.color,
          size: variant.size,
          sku: variant.sku,
          stock: Number(variant.stock || 0),
        })),

        availableVariants: availableVariants.map(
          (variant) => ({
            _id: variant._id,
            color: variant.color,
            size: variant.size,
            sku: variant.sku,
            stock: Number(variant.stock || 0),
          })
        ),

        sizes,
        colors,

        totalStock,
        variantCount: variants.length,
        stockStatus,
        isAvailable: totalStock > 0,

        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    // =======================================================
    // PAGINATION DATA
    // =======================================================

    const totalPages =
      totalProducts === 0
        ? 0
        : Math.ceil(totalProducts / perPage);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully.",

      products: formattedProducts,

      pagination: {
        currentPage,
        totalPages,
        totalProducts,
        perPage,

        hasNextPage:
          currentPage < totalPages,

        hasPreviousPage:
          currentPage > 1,
      },

      filters: {
        search: cleanSearch,
        category: cleanCategory,
        anime: cleanAnime,

        minPrice:
          parsedMinPrice !== null &&
          Number.isFinite(parsedMinPrice)
            ? parsedMinPrice
            : null,

        maxPrice:
          parsedMaxPrice !== null &&
          Number.isFinite(parsedMaxPrice)
            ? parsedMaxPrice
            : null,

        size: cleanSize,
        color: cleanColor,
        sort: String(sort),
      },
    });
  } catch (error) {
    console.error(
      "GET PUBLIC PRODUCTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products.",
    });
  }
};

// =========================================================
// ESCAPE REGEX
// =========================================================

const escapeRegex = (value) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};