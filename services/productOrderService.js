const ProductOrder = require("../models/productOrderModel");
const ProductMaster = require("../models/productMasterModel");
const User = require('../models/User');
const ApiError = require("../utils/error");
const { translateObjectFields } = require("../utils/translateUtil");
const {sendPushNotification} = require("../utils/sendPushNotification");

function generateOrderId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

const createOrderService = async (payload, requestingUser) => {
  if (!requestingUser?.id) {
    throw new ApiError("Unauthorized", 401);
  }

  if (!Array.isArray(payload.products) || payload.products.length === 0) {
    throw new ApiError("At least one product is required", 400);
  }

  // Build products array with price lookups and subtotal/total computations
  const productsDetailed = [];
  let computedTotal = 0;

  for (const item of payload.products) {
    const product = await ProductMaster.findOne({ _id: item.productId, deleted_at: null, isActive: true });
    if (!product) {
      throw new ApiError("Invalid product in order", 400);
    }
    const pricePerUnit = Number(item.pricePerUnit ?? product.price);
    const quantity = Number(item.quantity);
    if (!(quantity > 0)) {
      throw new ApiError("Quantity must be greater than 0", 400);
    }
    const subTotal = pricePerUnit * quantity;
    computedTotal += subTotal;
    productsDetailed.push({
      productId: product._id,
      quantity,
      pricePerUnit,
      subTotal,
    });
  }

  const totalPrice = Number(payload.totalPrice ?? computedTotal);

  const order = new ProductOrder({
    orderId: generateOrderId(),
    userId: requestingUser.id,
    products: productsDetailed,
    totalPrice,
  });
  await order.save();
  return order;
};

const getMyOrdersService = async (requestingUser, { page = 1, limit = 10, status, q = "", language = "en" }) => {
  if (!requestingUser?.id) {
    throw new ApiError("Unauthorized", 401);
  }

  const skip = (page - 1) * limit;
  const filter = {
    deleted_at: null,
    userId: requestingUser.id,
    ...(status ? { status } : {}),
    $or: q ? [{ orderId: { $regex: q, $options: "i" } }] : [{}],
  };

  const count = await ProductOrder.countDocuments(filter);

  const data = await ProductOrder.find(filter)
    .populate("products.productId", "name category price image")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Translate each productId.name individually
  if (language.toLowerCase() !== "en") {
    for (const order of data) {
      for (const p of order.products) {
        if (p.productId) {
          // Convert to plain object if not already
          const prodObj = { ...p.productId };
          const translated = await translateObjectFields(prodObj, ["name","category"], language);
          p.productId = translated;
        }
      }
    }
  }

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      limit,
    },
  };
};

const getAllOrdersService = async (requestingUser, { page = 1, limit = 10, status, q = "" }) => {
  if (requestingUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const skip = (page - 1) * limit;
  const filter = {
    deleted_at: null,
    ...(status ? { status } : {}),
    $or: q ? [{ orderId: { $regex: q, $options: "i" } }] : [{}],
  };
  const count = await ProductOrder.countDocuments(filter);
  const data = await ProductOrder.find(filter)
    .populate("userId", "first_name last_name phone")
    .populate("products.productId", "name category price image")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  return {
    data,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      limit,
    },
  };
};

const getOrderByIdService = async (id, requestingUser) => {
  const order = await ProductOrder.findOne({ _id: id, deleted_at: null })
    .populate("userId", "first_name last_name phone role")
    .populate("products.productId", "name category price image");
  if (!order) {
    throw new ApiError("Order not found", 404);
  }
  if (requestingUser.role !== "Admin" && String(order.userId._id) !== String(requestingUser.id)) {
    throw new ApiError("Unauthorized to access this order", 403);
  }
  return order;
};

const updateOrderUserService = async (id, updates, requestingUser) => {
  const order = await ProductOrder.findOne({ _id: id, deleted_at: null });
  if (!order) {
    throw new ApiError("Order not found", 404);
  }
  if (String(order.userId) !== String(requestingUser.id)) {
    throw new ApiError("Unauthorized to update this order", 403);
  }
  // Allow user to update products only when status is Pending
  if (order.status !== "Pending") {
    throw new ApiError("Order cannot be edited once processing started", 400);
  }
  if (updates.products) {
    if (!Array.isArray(updates.products) || updates.products.length === 0) {
      throw new ApiError("products must be a non-empty array", 400);
    }
    const productsDetailed = [];
    let computedTotal = 0;
    for (const item of updates.products) {
      const product = await ProductMaster.findOne({ _id: item.productId, deleted_at: null, isActive: true });
      if (!product) {
        throw new ApiError("Invalid product in order", 400);
      }
      const pricePerUnit = Number(item.pricePerUnit ?? product.price);
      const quantity = Number(item.quantity);
      if (!(quantity > 0)) {
        throw new ApiError("Quantity must be greater than 0", 400);
      }
      const subTotal = pricePerUnit * quantity;
      computedTotal += subTotal;
      productsDetailed.push({ productId: product._id, quantity, pricePerUnit, subTotal });
    }
    order.products = productsDetailed;
    order.totalPrice = Number(updates.totalPrice ?? computedTotal);
  }
  await order.save();
  return order;
};

const updateOrderStatusService = async (id, updates, requestingUser) => {
  console.log("updates",updates)
  if (requestingUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const order = await ProductOrder.findOne({ _id: id, deleted_at: null });
  if (!order) {
    throw new ApiError("Order not found", 404);
  }
  const allowedUpdates = ["status","remarks"];
  Object.keys(updates || {}).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      order[key] = updates[key];
    }
  });
  await order.save();

  // Send notification to the user
  const user = await User.findById(order.userId);
  if (user?.fcmToken?.length) {
    await sendPushNotification(user.fcmToken, {
      title: "Order Update",
      body: `Your order (${order.orderId}) is now ${order.status}.`,
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "productOrderUpdate"
      }
    });
  }

  return order;
};

const validateCartItemsService = async (productIds) => {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new ApiError("Product IDs array is required", 400);
  }

  const activeProducts = [];
  const inactiveProducts = [];

  for (const productId of productIds) {
    try {
      const product = await ProductMaster.findById(productId);
      
      if (!product) {
        inactiveProducts.push({
          productId,
          reason: "Product not found",
          status: "not_found"
        });
      } else if (product.deleted_at) {
        inactiveProducts.push({
          productId,
          reason: "Product has been deleted",
          status: "deleted",
          productName: product.name
        });
      } else if (!product.isActive) {
        inactiveProducts.push({
          productId,
          reason: "Product is not active",
          status: "inactive",
          productName: product.name
        });
      } else {
        activeProducts.push({
          productId,
          productName: product.name,
          price: product.price,
          category: product.category,
          status: "active"
        });
      }
    } catch (error) {
      inactiveProducts.push({
        productId,
        reason: "Invalid product ID",
        status: "invalid_id"
      });
    }
  }

  return {
    totalItems: productIds.length,
    activeItems: activeProducts.length,
    inactiveItems: inactiveProducts.length,
    activeProducts,
    inactiveProducts,
    allItemsValid: inactiveProducts.length === 0
  };
};

module.exports = {
  createOrderService,
  getMyOrdersService,
  getAllOrdersService,
  getOrderByIdService,
  updateOrderUserService,
  updateOrderStatusService,
  validateCartItemsService
};

