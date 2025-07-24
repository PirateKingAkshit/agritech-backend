const { asyncHandler } = require('../utils/asyncHandler');
const { validateCreateCrop, validateUpdateCrop, handleValidationErrors } = require('../utils/validator');
const { createCropService, getAllCropsService, getCropByIdService, updateCropService, deleteCropService, disableCropService, enableCropService } = require('../services/cropMasterService');

const createCrop = [
  validateCreateCrop,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const cropData = { ...req.body };
    if (req.file) {
      cropData.image = req.file.path;
    }
    const crop = await createCropService(cropData);
    res.status(201).json({ message: 'Crop created successfully', data: crop });
  }),
];

const getAllCrops = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, q="" } = req.query;
  const result = await getAllCropsService(parseInt(page), parseInt(limit), q);
  res.status(200).json(result);
});

const getCropById = asyncHandler(async (req, res) => {
  const crop = await getCropByIdService(req.params.id);
  res.status(200).json({ message: 'Crop fetched successfully', data: crop });
});

const updateCrop = [
  validateUpdateCrop,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const cropData = { ...req.body };
    if (req.file) {
      cropData.image = req.file.path;
    }
    const crop = await updateCropService(req.params.id, cropData);
    res.status(200).json({ message: 'Crop updated successfully', data: crop });
  }),
];

const deleteCrop = asyncHandler(async (req, res) => {
  const crop = await deleteCropService(req.params.id);
  res.status(200).json({ message: 'Crop deleted successfully', data: crop });
});

const disableCrop = asyncHandler(async (req, res) => {
  const crop = await disableCropService(req.params.id);
  res.status(200).json({ message: 'Crop disabled successfully', data: crop });
});

const enableCrop = asyncHandler(async (req, res) => {
  const crop = await enableCropService(req.params.id);
  res.status(200).json({ message: 'Crop enabled successfully', data: crop });
});

module.exports = {
  createCrop,
  getAllCrops,
  getCropById,
  updateCrop,
  deleteCrop,
  disableCrop,
  enableCrop,
};