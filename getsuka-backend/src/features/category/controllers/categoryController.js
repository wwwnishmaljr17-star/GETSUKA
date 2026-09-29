import Category from "../models/Category.js";

// ============================================
// ADD CATEGORY
// ============================================

export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate category name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const categoryName = name.trim();

    // Check if an active category already exists
    const existingCategory = await Category.findOne({
      name: {
        $regex: `^${categoryName}$`,
        $options: "i",
      },
      isDeleted: false,
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    // Check if a soft-deleted category exists
    const deletedCategory = await Category.findOne({
      name: {
        $regex: `^${categoryName}$`,
        $options: "i",
      },
      isDeleted: true,
    });

    // Restore soft-deleted category instead of creating duplicate
    if (deletedCategory) {
      deletedCategory.isDeleted = false;
      await deletedCategory.save();

      return res.status(200).json({
        success: true,
        message: "Category restored successfully",
        category: deletedCategory,
      });
    }

    // Create new category
    const category = await Category.create({
      name: categoryName,
    });
  
    return res.status(201).json({
      success: true,
      message: "Category added successfully",
      category,
    });
  } catch (error) {
    console.error("Add Category Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add category",
    });
  }
};


// ============================================
// GET CATEGORIES
// SEARCH + PAGINATION + DESCENDING ORDER
// ============================================

export const getCategories = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 5,
    } = req.query;

    const currentPage = Math.max(
      parseInt(page, 10) || 1,
      1
    );

    const categoriesPerPage = Math.max(
      parseInt(limit, 10) || 5,
      1
    );

    const searchText = search.trim();

    const filter = {
      isDeleted: false,
    };

    // Search category
    if (searchText) {
      filter.name = {
        $regex: searchText,
        $options: "i",
      };
    }

    // Total categories
    const totalCategories =
      await Category.countDocuments(filter);

    const totalPages = Math.ceil(
      totalCategories / categoriesPerPage
    );

    // Categories
    const categories = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(
        (currentPage - 1) *
          categoriesPerPage
      )
      .limit(categoriesPerPage);

    return res.status(200).json({
      success: true,
      categories,
      pagination: {
        currentPage,
        categoriesPerPage,
        totalCategories,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Get Categories Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

// ============================================
// GET SINGLE CATEGORY
// ============================================

export const getCategoryById = async (
  req,
  res
) => {
  try {
    const { categoryId } = req.params;

    const category =
      await Category.findOne({
        _id: categoryId,
        isDeleted: false,
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error(
      "Get Category Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

// ============================================
// EDIT CATEGORY
// ============================================

export const updateCategory = async (
  req,
  res
) => {
  try {
    const { categoryId } = req.params;
    const { name } = req.body;

    // Validate name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const categoryName = name.trim();

    // Find category
    const category =
      await Category.findOne({
        _id: categoryId,
        isDeleted: false,
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check duplicate category
    const duplicate =
      await Category.findOne({
        _id: { $ne: categoryId },
        name: {
          $regex: `^${categoryName}$`,
          $options: "i",
        },
        isDeleted: false,
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    category.name = categoryName;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error(
      "Update Category Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

// ============================================
// SOFT DELETE CATEGORY
// ============================================

export const deleteCategory = async (
  req,
  res
) => {
  try {
    const { categoryId } = req.params;

    const category =
      await Category.findOne({
        _id: categoryId,
        isDeleted: false,
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isDeleted = true;

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Category Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};