const CropSaleRequest = require("../models/cropSaleRequestModel")
const ProductOrder = require("../models/productOrderModel")
const ApiError = require("../utils/error");
const { translateObjectFields } = require("../utils/translateUtil");

const getLatestUserActivityService = async (user, language = "en") => {

  if (!user?.id) {
    throw new ApiError("Unauthorized", 401);
  }

  // Latest crop sale request
  let latestCropSale = await CropSaleRequest.findOne({
    userId: user.id,
    deleted_at: null,
  })
    .populate("cropId", "name category image description variety season") 
    .sort({ createdAt: -1 });

  // Latest product order
  let latestProductOrder = await ProductOrder.findOne({
    userId: user.id,
    deleted_at: null,
  })
    .populate("products.productId", "name category price image") 
    .sort({ createdAt: -1 });

  // Convert Mongoose subdocs to plain objects for translation
  if (latestCropSale?.cropId) {
    const cropObj = latestCropSale.cropId.toObject();
    const translatedCrop = await translateObjectFields(cropObj, ["name", "category"], language);
    latestCropSale.cropId = translatedCrop; // replace with translated object
  }

  if (latestProductOrder?.products?.length) {
    for (let i = 0; i < latestProductOrder.products.length; i++) {
      const prod = latestProductOrder.products[i].productId;
      if (prod) {
        const prodObj = prod.toObject();
        const translatedProd = await translateObjectFields(prodObj, ["name", "category"], language);
        latestProductOrder.products[i].productId = translatedProd; // replace with translated object
      }
    }
  }

  return {
    latestCropSale,
    latestProductOrder,
  };
};


module.exports = {getLatestUserActivityService}
