const { asyncHandler } = require("../utils/asyncHandler");
const {
  handleValidationErrors,
  validateCreateProduct,
} = require("../utils/validator");
const {
  createProductService,
  getAllProductsService,
  getActiveProductsPublicService,
  getProductByIdService,
  updateProductService,
  deleteProductService,
  disableProductService,
  enableProductService,
} = require("../services/productMasterService");

const createProduct = [
  validateCreateProduct,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const productData = { ...req.body };
    if (req.file) {
      productData.image = req.file.path;
    }
    const product = await createProductService(productData, req.user);
    res
      .status(200)
      .json({ message: "Product created successfully", data: product });
  }),
];

const getAllProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, q = "" } = req.query;
  const result = await getAllProductsService(
    parseInt(page),
    parseInt(limit),
    q
  );
  res.status(200).json(result);
});

const getActiveProductsPublic = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, q = "" } = req.query;
  const result = await getActiveProductsPublicService(
    parseInt(page),
    parseInt(limit),
    q
  );
  res.status(200).json(result);
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await getProductByIdService(req.params.id);
  res
    .status(200)
    .json({ message: "Product fetched successfully", data: product });
});

const updateProduct = [
  validateCreateProduct,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const productData = { ...req.body };
    if (req.file) {
      productData.image = req.file.path;
    }
    const product = await updateProductService(req.params.id, productData, req.user);
    res
      .status(200)
      .json({ message: "Product updated successfully", data: product });
  }),
];

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await deleteProductService(req.params.id, req.user);
  res
    .status(200)
    .json({ message: "Product deleted successfully", data: product });
});

const disableProduct = asyncHandler(async (req, res) => {
  const product = await disableProductService(req.params.id, req.user);
  res
    .status(200)
    .json({ message: "Product disabled successfully", data: product });
});

const enableProduct = asyncHandler(async (req, res) => {
  const product = await enableProductService(req.params.id, req.user);
  res
    .status(200)
    .json({ message: "Product enabled successfully", data: product });
});

module.exports = {
  createProduct,
  getAllProducts,
  getActiveProductsPublic,
  getProductById,
  updateProduct,
  deleteProduct,
  disableProduct,
  enableProduct,
};
