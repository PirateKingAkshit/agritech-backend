const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateProductOrder,
  validateUpdateProductOrderUser,
  validateUpdateProductOrderStatus,
  validatePagination,
  handleValidationErrors,
  validateCartItems,
} = require("../utils/validator");
const {
  createOrderService,
  getMyOrdersService,
  getAllOrdersService,
  getOrderByIdService,
  updateOrderUserService,
  updateOrderStatusService,
  validateCartItemsService
} = require("../services/productOrderService");

const createOrder = [
  validateCreateProductOrder,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const order = await createOrderService(req.body, req.user);
    res.status(200).json({ message: "Order created", data: order });
  }),
];

const getMyOrders = [
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, q = "" } = req.query;
    const result = await getMyOrdersService(req.user, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      q,
    });
    res.status(200).json(result);
  }),
];

const getAllOrders = [
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, q = "" } = req.query;
    const result = await getAllOrdersService(req.user, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      q,
    });
    res.status(200).json(result);
  }),
];

const getOrderById = asyncHandler(async (req, res) => {
  const data = await getOrderByIdService(req.params.id, req.user);
  res.status(200).json({ message: "Order fetched", data });
});

const updateOrderUser = [
  validateUpdateProductOrderUser,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const updated = await updateOrderUserService(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({ message: "Order updated", data: updated });
  }),
];

const updateOrderStatus = [
  validateUpdateProductOrderStatus,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const updated = await updateOrderStatusService(
      req.params.id,
      req.body,
      req.user
    );
    res
      .status(200)
      .json({ message: "Order updated by admin", data: updated });
  }),
];

const validateCart = [
  validateCartItems,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const result = await validateCartItemsService(req.body.productIds);
    res.status(200).json({ 
      message: "Cart validation completed", 
      data: result 
    });
  }),
];

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderUser,
  updateOrderStatus,
  validateCart
};

