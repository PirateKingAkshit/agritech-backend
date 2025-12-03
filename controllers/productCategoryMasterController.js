const { asyncHandler } = require("../utils/asyncHandler");
const ProductCategory = require("../models/productCategoryMaster");
const {
  
  handleValidationErrors,
  validateCreateProductCategory,
} = require("../utils/validator");
const {
    createProductCategoryService,
    getAllProductCategoriesService,
    getActiveProductCategoriesPublicService,
    getProductCategoryByIdService,
    updateProductCategoryService,
    deleteProductCategoryService,
} = require("../services/productCategoryMasterService");

const createProductCategory = [
  validateCreateProductCategory,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const productCategoryData = { ...req.body };
    const productCategory = await createProductCategoryService(productCategoryData, req.user);
    res.status(200).json({ message: "Product Category created successfully", data: productCategory });
  }),
];

const getAllProductCategories = asyncHandler(async (req, res) => {
  const { page, limit, q = "" } = req.query;
  const result = await getAllProductCategoriesService(parseInt(page), parseInt(limit), q);
  res.status(200).json(result);
});

const getActiveProductCategoriesPublic = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, q = "", language = "en" } = req.query;
  const result = await getActiveProductCategoriesPublicService(parseInt(page), parseInt(limit), q, language);
  res.status(200).json(result);
});

const getProductCategoryById = asyncHandler(async (req, res) => {
  const productCategory = await getProductCategoryByIdService(req.params.id);
  res.status(200).json({ message: "Product Category fetched successfully", data: productCategory });
});

const updateProductCategory = [
  validateCreateProductCategory,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const productCategoryData = { ...req.body };
    const productCategory = await updateProductCategoryService(req.params.id, productCategoryData, req.user);
    res.status(200).json({ message: "Product Category updated successfully", data: productCategory });
  }),
];

const deleteProductCategory = asyncHandler(async (req, res) => {
  const productCategory = await deleteProductCategoryService(req.params.id, req.user);
  res.status(200).json({ message: "Product Category deleted successfully", data: productCategory });
});

module.exports = {
  createProductCategory,
  getAllProductCategories,
  getActiveProductCategoriesPublic,
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
};
