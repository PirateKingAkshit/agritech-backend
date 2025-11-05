const ProductMaster = require("../models/productMasterModel");
const ApiError = require("../utils/error");
const fs = require("fs").promises;
const path = require("path");
const { translateObjectFields } = require("../utils/translateUtil");

const createProductService = async (productData, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const existingProductSkuCode = await ProductMaster.findOne({ skuCode: productData.skuCode, deleted_at: null });
  if (existingProductSkuCode) {
    throw new ApiError("Product with this sku code already exists", 409);
  }
  const existingProductName = await ProductMaster.findOne({ name: productData.name, deleted_at: null });
  if (existingProductName) {
    throw new ApiError("Product with this name already exists", 409);
  }
  const product = new ProductMaster(productData);
  await product.save();
  return product;
};

const getAllProductsService = async (page, limit, search) => {
  const skip = (page - 1) * limit;
  const count = await ProductMaster.countDocuments({
    deleted_at: null,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
      { skuCode: { $regex: search, $options: "i" } },
    ],
  });
  const products = await ProductMaster.find({
    deleted_at: null,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
      { skuCode: { $regex: search, $options: "i" } },
    ],
  })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  const totalPages = Math.ceil(count / limit);
  return {
    data: products,
    pagination: { currentPage: page, totalPages, totalItems: count, limit },
  };
};

const getActiveProductsPublicService = async (page, limit, search, language = "en") => {
  const skip = (page - 1) * limit;
  const baseFilter = {
    deleted_at: null,
    isActive: true,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
      { skuCode: { $regex: search, $options: "i" } },
    ],
  };
  const count = await ProductMaster.countDocuments(baseFilter);
  const products = await ProductMaster.find(baseFilter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();
  
  // Translate products fields if language is not English
  const fieldsToTranslate = ["name", "category", "description"];
  const translatedProducts = await Promise.all(
    products.map(async (product)=>{
      return await translateObjectFields(product, fieldsToTranslate, language)
    })
  )
  
  const totalPages = Math.ceil(count / limit);
  return {
    data: translatedProducts,
    pagination: { currentPage: page, totalPages, totalItems: count, limit },
  };
};

const getProductByIdService = async (id) => {
  const product = await ProductMaster.findOne({
    _id: id,
    deleted_at: null,
  });
  if (!product) {
    throw new ApiError("Product not found", 404);
  }
  return product;
};

const updateProductService = async (id, updates, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const existingProductSkuCode = await ProductMaster.findOne({ skuCode: updates.skuCode, deleted_at: null, _id: { $ne: id } });
  if (existingProductSkuCode) {
    throw new ApiError("Product with this sku code already exists", 409);
  }
  const existingProductName = await ProductMaster.findOne({ name: updates.name, deleted_at: null, _id: { $ne: id } });
  if (existingProductName) {
    throw new ApiError("Product with this name already exists", 409);
  }
  const product = await ProductMaster.findOne({
    _id: id,
    deleted_at: null,
  });
  if (!product) {
    throw new ApiError("Product not found", 404);
  }
  // If a new image is uploaded, delete the old image
  if (updates.image && product.image) {
    try {
      await fs.unlink(path.resolve(__dirname, "../", product.image));
    } catch (error) {
      console.error(`Failed to delete old image: ${product.image}`, error);
    }
  }
  Object.assign(product, updates);
  await product.save();
  return product;
};

const deleteProductService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const product = await ProductMaster.findOne({
    _id: id,
    deleted_at: null,
    isActive: true,
  });
  if (!product) {
    throw new ApiError("Product not found", 404);
  }
  // Delete the associated image file
  if (product.image) {
    try {
      await fs.unlink(path.resolve(__dirname, "../", product.image));
    } catch (error) {
      console.error(`Failed to delete image: ${product.image}`, error);
    }
  }
  product.isActive = false;
  product.deleted_at = new Date();
  await product.save();
  return product;
};

const disableProductService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const product = await ProductMaster.findOne({
    _id: id,
    deleted_at: null,
    isActive: true,
  });
  if (!product) {
    throw new ApiError("Product not found", 404);
  }
  product.isActive = false;
  await product.save();
  return product;
};

const enableProductService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const product = await ProductMaster.findOne({
    _id: id,
    deleted_at: null,
    isActive: false,
  });
  if (!product) {
    throw new ApiError("Product not found", 404);
  }
  product.isActive = true;
  await product.save();
  return product;
};

module.exports = {
  createProductService,
  getAllProductsService,
  getActiveProductsPublicService,
  getProductByIdService,
  updateProductService,
  deleteProductService,
  disableProductService,
  enableProductService,
};
