// productOrderService.js
const ProductOrder = require("../models/productOrderModel");
const ProductMaster = require("../models/productMasterModel"); // Assuming the file name is productMasterModel.js
const Error = require("../utils/error");

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

const createProductOrderService = async (products, requestingUser) => {
  if (!requestingUser?.id) {
    throw new Error("Unauthorized", 401);
  }

  // Collect product IDs from request
  const productIds = products.map((p) => p.productId);

  // Fetch all valid products in one query
  const validProducts = await ProductMaster.find({
    _id: { $in: productIds },
    deleted_at: null,
    isActive: true,
  });

  // Identify invalid/missing products
  const validIds = validProducts.map((p) => String(p._id));
  const invalidIds = productIds.filter((id) => !validIds.includes(id));

  if (invalidIds.length > 0) {
    throw new Error(
      `Order creation failed. The following products are invalid or inactive: ${invalidIds.join(", ")}`,
      404
    );
  }

  // ✅ All products are valid, create single orderId
  const orderId = generateOrderId();
  const orders = [];

  for (const item of products) {
    const product = validProducts.find((p) => String(p._id) === item.productId);

    const newOrder = new ProductOrder({
      orderId,
      userId: requestingUser.id,
      productId: item.productId,
      quantity: item.quantity,
      pricePerUnit: product.price,
      subTotal: item.quantity * product.price,
    });

    await newOrder.save();
    orders.push(newOrder);
  }

  return orders;
};


const getMyProductOrdersService = async (requestingUser, { page = 1, limit = 10, status, q = "" }) => {
  if (!requestingUser?.id) {
    throw new Error("Unauthorized", 401);
  }
  const skip = (page - 1) * limit;
  const filter = {
    deleted_at: null,
    userId: requestingUser.id,
    ...(status ? { status } : {}),
    $or: q
      ? [
          { orderId: { $regex: q, $options: "i" } },
        ]
      : [{}],
  };
  const count = await ProductOrder.countDocuments(filter);
  const data = await ProductOrder.find(filter)
    .populate("productId", "name category")
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

const getAllProductOrdersService = async (requestingUser, { page = 1, limit = 10, status, q = "" }) => {
  if (requestingUser.role !== "Admin") {
    throw new Error("Unauthorized", 403);
  }
  const skip = (page - 1) * limit;
  const filter = {
    deleted_at: null,
    ...(status ? { status } : {}),
    $or: q
      ? [
          { orderId: { $regex: q, $options: "i" } },
        ]
      : [{}],
  };
  const count = await ProductOrder.countDocuments(filter);
  const data = await ProductOrder.find(filter)
    .populate("userId", "first_name last_name phone email")
    .populate("productId", "name category image")
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

const getProductOrderByIdService = async (id, requestingUser) => {
  const order = await ProductOrder.findOne({ _id: id, deleted_at: null })
    .populate("userId", "first_name last_name phone role email")
    .populate("productId", "name category image");
  if (!order) {
    throw new Error("Product order not found", 404);
  }
  if (requestingUser.role !== "Admin" && String(order.userId._id) !== String(requestingUser.id)) {
    throw new Error("Unauthorized to access this order", 403);
  }
  return order;
};

const updateProductOrderUserService = async (id, updates, requestingUser) => {
  const order = await ProductOrder.findOne({ _id: id, deleted_at: null });
  if (!order) {
    throw new Error("Product order not found", 404);
  }
  if (String(order.userId) !== String(requestingUser.id)) {
    throw new Error("Unauthorized to update this order", 403);
  }
  if (updates.status === 'Cancelled') {
    if (order.status !== 'Pending') {
      throw new Error("Can only cancel pending orders", 400);
    }
    order.status = 'Cancelled';
  } else {
    throw new Error("User can only cancel the order", 400);
  }
  await order.save();
  return order;
};

const updateProductOrderStatusService = async (id, updates, requestingUser) => {
  if (requestingUser.role !== "Admin") {
    throw new Error("Unauthorized", 403);
  }
  const order = await ProductOrder.findOne({ _id: id, deleted_at: null });
  if (!order) {
    throw new Error("Product order not found", 404);
  }
  if (updates.status) {
    order.status = updates.status;
  }
  await order.save();
  return order;
};

module.exports = {
  createProductOrderService,
  getMyProductOrdersService,
  getAllProductOrdersService,
  getProductOrderByIdService,
  updateProductOrderUserService,
  updateProductOrderStatusService,
};