const CropMaster = require("../models/cropMasterModel");
const ApiError = require("../utils/error");
const fs = require("fs").promises;
const path = require("path");
const { translateObjectFields } = require("../utils/translateUtil");

const createCropService = async (cropData, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const existingCrop = await CropMaster.findOne({
    name: cropData.name,
    deleted_at: null,
  });
  if (existingCrop) {
    throw new ApiError("Crop with this name already exists", 409);
  }
  if (cropData.category) {
    const categoryExists = await CropMaster.findOne({
      _id: cropData.category,
      deleted_at: null,
    });
    if (!categoryExists) {
      throw new ApiError("Invalid category selected", 409);
    }
  }
  if (cropData.min_price != null && cropData.max_price != null) {
    const min = Number(cropData.min_price);
    const max = Number(cropData.max_price);

    if (Number.isNaN(min) || Number.isNaN(max)) {
      throw new ApiError("Price must be numeric", 409);
    }

    if (min > max) {
      throw new ApiError("Invalid price range", 409);
    }
  }

  const crop = new CropMaster(cropData);
  await crop.save();
  return crop.populate("category", "name _id");
};

const getAllCropsService = async (page, limit, search) => {
  const skip = (page - 1) * limit;

  const filter = {
    deleted_at: null,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { variety: { $regex: search, $options: "i" } },
      { season: { $regex: search, $options: "i" } },
    ],
  };

  const count = await CropMaster.countDocuments(filter);

  const crops = await CropMaster.find(filter)
    .populate("category", "name _id")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalPages = Math.ceil(count / limit);

  return {
    data: crops,
    pagination: { currentPage: page, totalPages, totalItems: count, limit },
  };
};

const getActiveCropsPublicService = async (
  page,
  limit,
  search,
  language = "en"
) => {
  const skip = (page - 1) * limit;

  const filter = {
    deleted_at: null,
    isActive: true,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { variety: { $regex: search, $options: "i" } },
      { season: { $regex: search, $options: "i" } },
    ],
  };

  const count = await CropMaster.countDocuments(filter);

  const crops = await CropMaster.find(filter)
    .populate("category", "name _id")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  const fieldsToTranslate = [
    "name",
    "description",
    "category.name",
    "variety",
    "season",
  ];

  const translatedCrops = await Promise.all(
    crops.map(async (crop) => {
      const translated = await translateObjectFields(
        crop,
        fieldsToTranslate,
        language
      );
      return translated;
    })
  );

  const totalPages = Math.ceil(count / limit);

  return {
    data: translatedCrops,
    pagination: { currentPage: page, totalPages, totalItems: count, limit },
  };
};

const getCropByIdService = async (id) => {
  const crop = await CropMaster.findOne({
    _id: id,
    deleted_at: null,
  }).populate("category", "name _id");
  if (!crop) {
    throw new ApiError("Crop not found", 404);
  }
  return crop;
};

const updateCropService = async (id, updates, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }

  const existingCrop = await CropMaster.findOne({
    name: updates.name,
    deleted_at: null,
    _id: { $ne: id },
  });

  if (existingCrop) {
    throw new ApiError("Crop with this name already exists", 409);
  }

  if (updates.category) {
    const categoryExists = await CropMaster.findOne({
      _id: updates.category,
      deleted_at: null,
    });

    if (!categoryExists) {
      throw new ApiError("Invalid category selected", 400);
    }
  }

  if (updates.min_price != null && updates.max_price != null) {
    const min = Number(updates.min_price);
    const max = Number(updates.max_price);

    if (Number.isNaN(min) || Number.isNaN(max)) {
      throw new ApiError("Price must be numeric", 409);
    }

    if (min > max) {
      throw new ApiError("Invalid price range", 409);
    }
  }

  const crop = await CropMaster.findOne({
    _id: id,
    deleted_at: null,
  });

  if (!crop) throw new ApiError("Crop not found", 404);

  Object.assign(crop, updates);

  await crop.save();

  return crop.populate("category", "name _id");
};

const deleteCropService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const crop = await CropMaster.findOne({
    _id: id,
    deleted_at: null,
    isActive: true,
  });
  if (!crop) {
    throw new ApiError("Crop not found", 404);
  }
  // Delete the associated image file
  if (crop.image) {
    try {
      await fs.unlink(path.resolve(__dirname, "../", crop.image));
    } catch (error) {
      console.error(`Failed to delete image: ${crop.image}`, error);
    }
  }
  crop.isActive = false;
  crop.deleted_at = new Date();
  await crop.save();
  return crop;
};

const disableCropService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const crop = await CropMaster.findOne({
    _id: id,
    deleted_at: null,
    isActive: true,
  });
  if (!crop) {
    throw new ApiError("Crop not found", 404);
  }
  crop.isActive = false;
  await crop.save();
  return crop;
};

const enableCropService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }
  const crop = await CropMaster.findOne({
    _id: id,
    deleted_at: null,
    isActive: false,
  });
  if (!crop) {
    throw new ApiError("Crop not found", 404);
  }
  crop.isActive = true;
  await crop.save();
  return crop;
};

const getParentCropsService = async () => {
  const parentCrops = await CropMaster.find({
    category: null,
    deleted_at: null,
    isActive: true,
  })
    .select("name _id image")
    .sort({ name: 1 });

  return parentCrops;
};

const getParentsCropPublicService = async (
  page,
  limit,
  search,
  language = "en"
) => {
  const skip = (page - 1) * limit;

  const filter = {
    deleted_at: null,
    isActive: true,
    category: null, // Only parent crops
    $or: [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { variety: { $regex: search, $options: "i" } },
      { season: { $regex: search, $options: "i" } },
    ],
  };

  const count = await CropMaster.countDocuments(filter);

  const crops = await CropMaster.find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ name: 1 })
    .lean();

  const fieldsToTranslate = ["name", "description", "variety", "season"];

  const translatedCrops = await Promise.all(
    crops.map(async (crop) => {
      // check if this crop has children
      const childrenCount = await CropMaster.countDocuments({
        category: crop._id,
        deleted_at: null,
        isActive: true,
      });

      const hasChildren = childrenCount > 0;

      const translated = await translateObjectFields(
        crop,
        fieldsToTranslate,
        language
      );

      return {
        ...translated,
        children: hasChildren, // add boolean
      };
    })
  );

  const totalPages = Math.ceil(count / limit);

  return {
    data: translatedCrops,
    pagination: { currentPage: page, totalPages, totalItems: count, limit },
  };
};

const getChildCropPublicService = async (
  parentId,
  page,
  limit,
  search,
  language = "en"
) => {
  const skip = (page - 1) * limit;

  // Verify parent exists
  const parentCrop = await CropMaster.findOne({
    _id: parentId,
    deleted_at: null,
    isActive: true,
  });

  if (!parentCrop) {
    throw new ApiError("Parent crop not found", 404);
  }

  const filter = {
    deleted_at: null,
    isActive: true,
    category: parentId, // Child crops have this parentId as their category
    $or: [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { variety: { $regex: search, $options: "i" } },
      { season: { $regex: search, $options: "i" } },
    ],
  };

  const count = await CropMaster.countDocuments(filter);

  const crops = await CropMaster.find(filter)
    .populate("category", "name _id image")
    .skip(skip)
    .limit(limit)
    .sort({ name: 1 })
    .lean();

  const fieldsToTranslate = [
    "name",
    "description",
    "category.name",
    "variety",
    "season",
  ];

  const translatedCrops = await Promise.all(
    crops.map(async (crop) => {
      const translated = await translateObjectFields(
        crop,
        fieldsToTranslate,
        language
      );
      return translated;
    })
  );

  const totalPages = Math.ceil(count / limit);

  return {
    data: translatedCrops,
    pagination: { currentPage: page, totalPages, totalItems: count, limit },
  };
};

module.exports = {
  createCropService,
  getAllCropsService,
  getActiveCropsPublicService,
  getCropByIdService,
  updateCropService,
  deleteCropService,
  disableCropService,
  enableCropService,
  getParentCropsService,
  getParentsCropPublicService,
  getChildCropPublicService,
};
