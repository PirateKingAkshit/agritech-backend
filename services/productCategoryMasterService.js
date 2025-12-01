const ProductCategory = require("../models/productCategoryMaster");
const ApiError = require("../utils/error");
const { translateObjectFields } = require("../utils/translateUtil");

// Create Product Category
const createProductCategoryService = async (categoryData, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }

  const existing = await ProductCategory.findOne({
    name: categoryData.name,
    deleted_at: null
  });

  if (existing) {
    throw new ApiError("Category with this name already exists", 409);
  }

  const category = new ProductCategory(categoryData);
  await category.save();
  return category;
};

// Get All (Admin)
const getAllProductCategoriesService = async (page, limit, search) => {
  const skip = (page - 1) * limit;

  const filter = {
    deleted_at: null,
    $or: [
      { name: { $regex: search, $options: "i" } },
    ]
  };

  const count = await ProductCategory.countDocuments(filter);

  const categories = await ProductCategory.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return {
    data: categories,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      limit
    }
  };
};

// Get Active Only (Public)
const getActiveProductCategoriesPublicService = async (page, limit, search, language = "en") => {
  const skip = (page - 1) * limit;

  const filter = {
    deleted_at: null,
    $or: [
      { name: { $regex: search, $options: "i" } },
    ]
  };

  const count = await ProductCategory.countDocuments(filter);

  const categories = await ProductCategory.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  // Translate only "name"
  const translated = await Promise.all(
    categories.map((item) =>
      translateObjectFields(item, ["name"], language)
    )
  );

  return {
    data: translated,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      limit
    }
  };
};

// Get by ID
const getProductCategoryByIdService = async (id) => {
  const category = await ProductCategory.findOne({
    _id: id,
    deleted_at: null
  });

  if (!category) {
    throw new ApiError("Product Category not found", 404);
  }

  return category;
};

// Update Category
const updateProductCategoryService = async (id, updates, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }

  // Check duplicate name except itself
  const existing = await ProductCategory.findOne({
    name: updates.name,
    deleted_at: null,
    _id: { $ne: id }
  });

  if (existing) {
    throw new ApiError("Category with this name already exists", 409);
  }

  const category = await ProductCategory.findOne({
    _id: id,
    deleted_at: null
  });

  if (!category) {
    throw new ApiError("Product Category not found", 404);
  }

  Object.assign(category, updates);
  await category.save();

  return category;
};

// Soft Delete
const deleteProductCategoryService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }

  const category = await ProductCategory.findOne({
    _id: id,
    deleted_at: null
  });

  if (!category) {
    throw new ApiError("Product Category not found", 404);
  }

  category.deleted_at = new Date();
  await category.save();

  return category;
};

module.exports = {
  createProductCategoryService,
  getAllProductCategoriesService,
  getActiveProductCategoriesPublicService,
  getProductCategoryByIdService,
  updateProductCategoryService,
  deleteProductCategoryService,
};
