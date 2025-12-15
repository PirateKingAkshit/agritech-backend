const TutorialsMaster = require("../models/tutorialsMasterModel");
const cleanQuillHtml = require("../utils/cleanQuillHtml");
const ApiError = require("../utils/error");
const fs = require("fs").promises;
const path = require("path");
const extractYouTubeIframes = require("../utils/extractYouTubeIframes");

const createTutorialService = async (data, requestUser) => {
  if (requestUser.role !== "Admin") throw new ApiError("Unauthorized", 403);

  const exists = await TutorialsMaster.findOne({
    name: data.name,
    deleted_at: null,
  });
  if (exists) throw new ApiError("Tutorial with this name already exists", 409);

  const tutorial = new TutorialsMaster(data);
  await tutorial.save();
  return tutorial;
};

const getAllTutorialsService = async (page, limit, search) => {
  const skip = (page - 1) * limit;
  const query = {
    deleted_at: null,
    $or: [
      { name: { $regex: search, $options: "i" } },
      // { language: { $regex: search, $options: "i" } },
      // { description: { $regex: search, $options: "i" } },
    ],
  };
  const count = await TutorialsMaster.countDocuments(query);
  const tutorials = await TutorialsMaster.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return {
    data: tutorials,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      limit,
    },
  };
};

const getActiveTutorialsPublicService = async (page, limit, search, lang) => {
  const skip = (page - 1) * limit;
  const query = {
    deleted_at: null,
    isActive: true,
    $or: [
      // { name: { $regex: search, $options: "i" } },
      { language: { $regex: lang, $options: "i" } },
      // { description: { $regex: search, $options: "i" } },
    ],
  };
  const count = await TutorialsMaster.countDocuments(query);
  const tutorials = await TutorialsMaster.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  return {
    data: tutorials,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      limit,
    },
  };
};

const getActiveTutorialsByIdPublicService = async (id, lang) => {
  const tutorial = await TutorialsMaster.findOne({
    _id: id,
    deleted_at: null,
    isActive: true,
  });

  if (!tutorial) throw new ApiError("Tutorial not found", 404);

  const cleanedHtml = cleanQuillHtml(tutorial.description);
  const { cleanedHtml: safeHtml, videos } = extractYouTubeIframes(cleanedHtml);

  return {
    message: "Tutorial fetched successfully",
    data: {
      ...tutorial.toObject(),
      descriptionHtml: safeHtml,
      videos,
    },
  };
};

const getTutorialByIdService = async (id) => {
  const tutorial = await TutorialsMaster.findOne({ _id: id, deleted_at: null });
  if (!tutorial) throw new ApiError("Tutorial not found", 404);
  return tutorial;
};

const updateTutorialService = async (id, updates, requestUser) => {
  if (requestUser.role !== "Admin") throw new ApiError("Unauthorized", 403);

  // If name is being updated, check for uniqueness
  if (updates.name) {
    const exists = await TutorialsMaster.findOne({
      name: updates.name,
      deleted_at: null,
      _id: { $ne: id },
    });
    if (exists) throw new ApiError("Tutorial with this name already exists", 409);
  }
  const tutorial = await TutorialsMaster.findOne({ _id: id, deleted_at: null });
  if (!tutorial) throw new ApiError("Tutorial not found", 404);

  if (updates.image && tutorial.image) {
    try {
      await fs.unlink(path.resolve(__dirname, "../", tutorial.image));
    } catch (error) {
      console.error(`Failed to delete old image: ${tutorial.image}`, error);
    }
  }

  Object.assign(tutorial, updates);
  await tutorial.save();
  return tutorial;
};

const deleteTutorialService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") throw new ApiError("Unauthorized", 403);
  const tutorial = await TutorialsMaster.findOne({
    _id: id,
    deleted_at: null,
    isActive: true,
  });
  if (!tutorial) throw new ApiError("Tutorial not found", 404);

  tutorial.isActive = false;
  tutorial.deleted_at = new Date();
  await tutorial.save();
  return tutorial;
};

const disableTutorialService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") throw new ApiError("Unauthorized", 403);
  const tutorial = await TutorialsMaster.findOne({
    _id: id,
    deleted_at: null,
    isActive: true,
  });
  if (!tutorial) throw new ApiError("Tutorial not found", 404);

  tutorial.isActive = false;
  await tutorial.save();
  return tutorial;
};

const enableTutorialService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") throw new ApiError("Unauthorized", 403);
  const tutorial = await TutorialsMaster.findOne({
    _id: id,
    deleted_at: null,
    isActive: false,
  });
  if (!tutorial) throw new ApiError("Tutorial not found", 404);

  tutorial.isActive = true;
  await tutorial.save();
  return tutorial;
};

module.exports = {
  createTutorialService,
  getAllTutorialsService,
  getActiveTutorialsPublicService,
  getActiveTutorialsByIdPublicService,
  getTutorialByIdService,
  updateTutorialService,
  deleteTutorialService,
  disableTutorialService,
  enableTutorialService,
};
