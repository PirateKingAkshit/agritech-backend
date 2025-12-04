const CropSaleRequest = require("../models/cropSaleRequestModel");
const User = require('../models/User');
const ApiError = require("../utils/error");
const { translateObjectFields } = require("../utils/translateUtil");
const {sendPushNotification} = require('../utils/sendPushNotification');

function generateRequestId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CSR-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

const createSaleRequestService = async (payload, requestingUser) => {
  if (!requestingUser?.id) {
    throw new ApiError("Unauthorized", 401);
  }
  const request = new CropSaleRequest({
    requestId: generateRequestId(),
    userId: requestingUser.id,
    cropId: payload.cropId,
    quantity: payload.quantity,
    quantity_unit: payload.quantity_unit,
    price_per_unit: payload.price_per_unit,
    ready_to_sell_on: payload.ready_to_sell_on
  });
  await request.save();
  return request;
};

const getMySaleRequestsService = async (requestingUser, { page = 1, limit = 10, status, q = "", language = "en" }) => {
  if (!requestingUser?.id) {
    throw new ApiError("Unauthorized", 401);
  }
  const skip = (page - 1) * limit;
  const filter = {
    deleted_at: null,
    userId: requestingUser.id,
    ...(status ? { status } : {}),
    $or: q
      ? [
          { requestId: { $regex: q, $options: "i" } },
        ]
      : [{}],
  };
  const count = await CropSaleRequest.countDocuments(filter);
  const data = await CropSaleRequest.find(filter)
    .populate("cropId", "name category image")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
    // Translate crop sale request fields if language is not English

    const fieldsToTranslate = ["cropId.name", "cropId.category"];
    const translatedData = await Promise.all(
      data.map(async (item)=>{
        return await translateObjectFields(item, fieldsToTranslate, language)
      })
    )

  return {
    data : translatedData,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      limit,
    },
  };
};

// For Admin //

const getAllSaleRequestsService = async (requestingUser, { page = 1, limit = 10, status, q = "" }) => {
  if (requestingUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const skip = (page - 1) * limit;
  const filter = {
    deleted_at: null,
    ...(status ? { status } : {}),
    $or: q
      ? [
          { requestId: { $regex: q, $options: "i" } },
        ]
      : [{}],
  };
  const count = await CropSaleRequest.countDocuments(filter);
  const data = await CropSaleRequest.find(filter)
    .populate("userId", "first_name last_name phone")
    .populate("cropId", "name category image")
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

const getSaleRequestByIdService = async (id, requestingUser) => {
  const request = await CropSaleRequest.findOne({ _id: id, deleted_at: null })
    .populate("userId", "first_name last_name phone role")
    .populate("cropId", "name category image");
  if (!request) {
    throw new ApiError("Sale request not found", 404);
  }
  if (requestingUser.role !== "Admin" && String(request.userId._id) !== String(requestingUser.id)) {
    throw new ApiError("Unauthorized to access this request", 403);
  }
  return request;
};

const updateSaleRequestUserService = async (id, updates, requestingUser) => {
  const request = await CropSaleRequest.findOne({ _id: id, deleted_at: null });
  if (!request) {
    throw new ApiError("Sale request not found", 404);
  }
  if (String(request.userId) !== String(requestingUser.id)) {
    throw new ApiError("Unauthorized to update this request", 403);
  }
  const allowedUpdates = [
    "quantity",
    "quantity_unit",
    "price_per_unit",
    "ready_to_sell_on"
  ];
  Object.keys(updates).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      request[key] = updates[key];
    }
  });
  await request.save();
  return request;
};

const updateSaleRequestStatusService = async (id, updates, requestingUser) => {
  if (requestingUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const request = await CropSaleRequest.findOne({ _id: id, deleted_at: null });
  if (!request) {
    throw new ApiError("Sale request not found", 404);
  }
  const allowedUpdates = [
    "status", // Admin can only update status now
    "remarks"
  ];
  Object.keys(updates || {}).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      request[key] = updates[key];
    }
  });
  await request.save();
  //send notification to user
  const user = await User.findById(request.userId);
  if (user?.fcmToken?.length > 0) {
    await sendPushNotification(user.fcmToken, {
      title: "Crop Sale Request Updated",
      body: `Your crop sale request (${request.requestId}) is now "${request.status}".`,
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "cropSaleRequestUpdate"
      }
    });
  }

  return request;
};

module.exports = {
  createSaleRequestService,
  getMySaleRequestsService,
  getAllSaleRequestsService,
  getSaleRequestByIdService,
  updateSaleRequestUserService,
  updateSaleRequestStatusService,
};


