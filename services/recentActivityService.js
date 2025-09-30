const CropSaleRequest = require("../models/cropSaleRequestModel")
const ProductOrder = require("../models/productOrderModel")
const Error = require("../utils/error");


const getLatestUserActivityService = async (user) => {
  if (!user?.id) {
    throw new Error("Unauthorized", 401);
  }

  // Latest crop sale request
  const latestCropSale = await CropSaleRequest.findOne({
    userId: user.id,
    deleted_at: null,
  })
    .populate("cropId", "name category") // populate cropId with name and category
    .sort({ createdAt: -1 });

  // Latest product order
  const latestProductOrder = await ProductOrder.findOne({
    userId: user.id,
    deleted_at: null,
  })
    .populate("products.productId", "name category price image") // populate each productId with details
    .sort({ createdAt: -1 });

  return {
    latestCropSale,
    latestProductOrder,
  };
};


module.exports = {getLatestUserActivityService}
