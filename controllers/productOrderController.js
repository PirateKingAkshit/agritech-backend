// productOrderController.js
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateProductOrder,
  validateUpdateProductOrderUser,
  validateUpdateProductOrderStatus,
  validatePagination,
  handleValidationErrors,
} = require("../utils/validator");
const {
  createProductOrderService,
  getMyProductOrdersService,
  getAllProductOrdersService,
  getProductOrderByIdService,
  updateProductOrderUserService,
  updateProductOrderStatusService,
} = require("../services/productOrderService");

const createProductOrder = [
  validateCreateProductOrder,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const orders = await createProductOrderService(req.body.products, req.user);
    res.status(200).json({ message: "Product orders created", data: orders });
  }),
];

const getMyProductOrders = [
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, q = "" } = req.query;
    const result = await getMyProductOrdersService(req.user, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      q,
    });
    res.status(200).json(result);
  }),
];

const getAllProductOrders = [
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, q = "" } = req.query;
    const result = await getAllProductOrdersService(req.user, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      q,
    });
    res.status(200).json(result);
  }),
];

const getProductOrderById = asyncHandler(async (req, res) => {
  const data = await getProductOrderByIdService(req.params.id, req.user);
  res.status(200).json({ message: "Product order fetched", data });
});

const updateProductOrderUser = [
  validateUpdateProductOrderUser,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const updated = await updateProductOrderUserService(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({ message: "Product order updated", data: updated });
  }),
];

const updateProductOrderStatus = [
  validateUpdateProductOrderStatus,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const updated = await updateProductOrderStatusService(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({ message: "Product order updated by admin", data: updated });
  }),
];

module.exports = {
  createProductOrder,
  getMyProductOrders,
  getAllProductOrders,
  getProductOrderById,
  updateProductOrderUser,
  updateProductOrderStatus,
};