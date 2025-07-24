const CropMaster = require('../models/cropMasterModel');
const Error = require('../utils/error');
const fs = require('fs').promises;
const path = require('path');

const createCropService = async (cropData) => {
  const crop = new CropMaster(cropData);
  await crop.save();
  return crop;
};

const getAllCropsService = async (page, limit) => {
  const skip = (page - 1) * limit;
  const count = await CropMaster.countDocuments({ deleted_at: null, isActive: true });
  const crops = await CropMaster.find({ deleted_at: null, isActive: true })
    .skip(skip)
    .limit(limit)
    .sort({ created_at: -1 });
  const totalPages = Math.ceil(count / limit);
  return {
    data: crops,
    pagination: { currentPage: page, totalPages, totalItems: count, limit },
  };
};

const getCropByIdService = async (id) => {
  const crop = await CropMaster.findOne({ _id: id, deleted_at: null, isActive: true });
  if (!crop) {
    throw new Error('Crop not found', 404);
  }
  return crop;
};

const updateCropService = async (id, updates) => {
  const crop = await CropMaster.findOne({ _id: id, deleted_at: null, isActive: true });
  if (!crop) {
    throw new Error('Crop not found', 404);
  }
  // If a new image is uploaded, delete the old image
  if (updates.image && crop.image) {
    try {
      await fs.unlink(path.resolve(__dirname, '../', crop.image));
    } catch (error) {
      console.error(`Failed to delete old image: ${crop.image}`, error);
    }
  }
  Object.assign(crop, updates);
  await crop.save();
  return crop;
};

const deleteCropService = async (id) => {
  const crop = await CropMaster.findOne({ _id: id, deleted_at: null, isActive: true });
  if (!crop) {
    throw new Error('Crop not found', 404);
  }
  // Delete the associated image file
  if (crop.image) {
    try {
      await fs.unlink(path.resolve(__dirname, '../', crop.image));
    } catch (error) {
      console.error(`Failed to delete image: ${crop.image}`, error);
    }
  }
  crop.isActive = false;
  crop.deleted_at = new Date();
  await crop.save();
  return crop;
};

const disableCropService = async (id) => {
  const crop = await CropMaster.findOne({ _id: id, deleted_at: null, isActive: true });
  if (!crop) {
    throw new Error('Crop not found', 404);
  }
  crop.isActive = false;
  await crop.save();
  return crop;
};

const enableCropService = async (id) => {
  const crop = await CropMaster.findOne({ _id: id, deleted_at: null, isActive: false });
  if (!crop) {
    throw new Error('Crop not found', 404);
  }
  crop.isActive = true;
  await crop.save();
  return crop;
};

module.exports = {
  createCropService,
  getAllCropsService,
  getCropByIdService,
  updateCropService,
  deleteCropService,
  disableCropService,
  enableCropService,
};