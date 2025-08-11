const GovernmentScheme = require("../models/governmentSchemeModel");
const Error = require("../utils/error");
const fs = require("fs").promises;
const path = require("path");

const createSchemeService = async (schemeData, files, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new Error("Unauthorized", 403);
  }
  const { name, translations } = schemeData;
  if (!translations || !Array.isArray(translations) || translations.length === 0) {
    throw new Error("At least one translation is required", 400);
  }

  // Generate next schemeId in the format SCHEME_001, SCHEME_002, ...
  let lastScheme = await GovernmentScheme.findOne({ schemeId: { $regex: /^SCHEME_\d+$/ } })
    .sort({ schemeId: -1 })
    .collation({ locale: "en_US", numericOrdering: true });
  let nextNumber = 1;
  if (lastScheme && lastScheme.schemeId) {
    const match = lastScheme.schemeId.match(/SCHEME_(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  // Pad with zeros to at least 3 digits, but grow as needed
  const nextSchemeId = `SCHEME_${nextNumber.toString().padStart(3, "0")}`;

  const scheme = new GovernmentScheme({
    name,
    schemeId: nextSchemeId,
    translation: [],
  });

  const existingLanguages = [];
  for (let i = 0; i < translations.length; i++) {
    const { name: transName, description, language } = translations[i];
    if (existingLanguages.includes(language)) {
      throw new Error(`Translation for language ${language} already exists`, 409);
    }
    const imageField = `translation_images_${i}`;
    const image = files.find(f => f.fieldname === imageField)?.path;
    if (!image) {
      throw new Error(`Image is required for translation in ${language}`, 400);
    }
    scheme.translation.push({
      name: transName,
      description,
      language,
      image,
    });
    existingLanguages.push(language);
  }

  await scheme.save();
  return scheme;
};

const getAllSchemesService = async (page, limit, search) => {
  const skip = (page - 1) * limit;
  const count = await GovernmentScheme.countDocuments({
    deleted_at: null,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { "translation.description": { $regex: search, $options: "i" } },
      { "translation.language": { $regex: search, $options: "i" } },
      { schemeId: { $regex: search, $options: "i" } },
    ],
  });
  const schemes = await GovernmentScheme.find({
    deleted_at: null,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { "translation.description": { $regex: search, $options: "i" } },
      { "translation.language": { $regex: search, $options: "i" } },
      { schemeId: { $regex: search, $options: "i" } },
    ],
  })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  const totalPages = Math.ceil(count / limit);
  return {
    data: schemes,
    pagination: { currentPage: page, totalPages, totalItems: count, limit },
  };
};

const getActiveSchemesPublicService = async (page, limit, search) => {
  const skip = (page - 1) * limit;
  const baseFilter = {
    deleted_at: null,
    isActive: true,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { "translation.description": { $regex: search, $options: "i" } },
      { "translation.language": { $regex: search, $options: "i" } },
      { schemeId: { $regex: search, $options: "i" } },
    ],
  };
  const count = await GovernmentScheme.countDocuments(baseFilter);
  const schemes = await GovernmentScheme.find(baseFilter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  const totalPages = Math.ceil(count / limit);
  return {
    data: schemes,
    pagination: { currentPage: page, totalPages, totalItems: count, limit },
  };
};

const getSchemeByIdService = async (schemeId) => {
  const scheme = await GovernmentScheme.findOne({
    schemeId,
    deleted_at: null,
  });
  if (!scheme) {
    throw new Error("Scheme not found", 404);
  }
  return scheme;
};

const updateSchemeService = async (id, updates, files, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new Error("Unauthorized", 403);
  }
  const scheme = await GovernmentScheme.findOne({
    schemeId: id,
    deleted_at: null,
  });
  if (!scheme) {
    throw new Error("Scheme not found", 404);
  }

  const { name, translations } = updates;
  if (name) {
    scheme.name = name;
  }

  if (translations && Array.isArray(translations)) {
    const existingLanguages = [];
    const newTranslations = [];

    // Delete images for translations that are removed
    for (const oldTranslation of scheme.translation) {
      if (!translations.some(t => t._id && t._id === oldTranslation._id.toString())) {
        if (oldTranslation.image) {
          try {
            await fs.unlink(path.resolve(__dirname, "../", oldTranslation.image));
          } catch (error) {
            console.error(`Failed to delete old image: ${oldTranslation.image}`, error);
          }
        }
      }
    }

    for (let i = 0; i < translations.length; i++) {
      const { _id, name: transName, description, language } = translations[i];
      const imageField = `translation_images_${i}`;
      const newImage = files.find(f => f.fieldname === imageField)?.path;

      if (_id) {
        // Update existing translation
        const translationIndex = scheme.translation.findIndex(t => t._id.toString() === _id);
        if (translationIndex === -1) {
          throw new Error(`Translation with ID ${_id} not found`, 404);
        }
        if (language && language !== scheme.translation[translationIndex].language) {
          if (existingLanguages.includes(language) || scheme.translation.some(t => t.language === language && t._id.toString() !== _id)) {
            throw new Error(`Translation for language ${language} already exists`, 409);
          }
        }
        if (newImage && scheme.translation[translationIndex].image) {
          try {
            await fs.unlink(path.resolve(__dirname, "../", scheme.translation[translationIndex].image));
          } catch (error) {
            console.error(`Failed to delete old image: ${scheme.translation[translationIndex].image}`, error);
          }
        }
        newTranslations[translationIndex] = {
          _id: scheme.translation[translationIndex]._id,
          name: transName || scheme.translation[translationIndex].name,
          description: description !== undefined ? description : scheme.translation[translationIndex].description,
          language: language || scheme.translation[translationIndex].language,
          image: newImage || scheme.translation[translationIndex].image,
        };
      } else {
        // Add new translation
        if (existingLanguages.includes(language) || scheme.translation.some(t => t.language === language)) {
          throw new Error(`Translation for language ${language} already exists`, 409);
        }
        if (!newImage) {
          throw new Error(`Image is required for translation in ${language}`, 400);
        }
        newTranslations.push({
          name: transName,
          description,
          language,
          image: newImage,
        });
      }
      existingLanguages.push(language);
    }

    scheme.translation = newTranslations;
  }

  // Update top-level name if English translation is updated
  const englishTranslation = scheme.translation.find(t => t.language.toLowerCase() === "english");
  if (englishTranslation) {
    scheme.name = englishTranslation.name;
  }

  await scheme.save();
  return scheme;
};

const deleteSchemeService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new Error("Unauthorized", 403);
  }
  const scheme = await GovernmentScheme.findOne({
    _id: id,
    deleted_at: null,
    isActive: true,
  });
  if (!scheme) {
    throw new Error("Scheme not found", 404);
  }
  for (const translation of scheme.translation) {
    if (translation.image) {
      try {
        await fs.unlink(path.resolve(__dirname, "../", translation.image));
      } catch (error) {
        console.error(`Failed to delete image: ${translation.image}`, error);
      }
    }
  }
  scheme.isActive = false;
  scheme.deleted_at = new Date();
  await scheme.save();
  return scheme;
};

const disableSchemeService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new Error("Unauthorized", 403);
  }
  const scheme = await GovernmentScheme.findOne({
    _id: id,
    deleted_at: null,
    isActive: true,
  });
  if (!scheme) {
    throw new Error("Scheme not found", 404);
  }
  scheme.isActive = false;
  await scheme.save();
  return scheme;
};

const enableSchemeService = async (id, requestUser) => {
  if (requestUser.role !== "Admin") {
    throw new Error("Unauthorized", 403);
  }
  const scheme = await GovernmentScheme.findOne({
    _id: id,
    deleted_at: null,
    isActive: false,
  });
  if (!scheme) {
    throw new Error("Scheme not found", 404);
  }
  scheme.isActive = true;
  await scheme.save();
  return scheme;
};

module.exports = {
  createSchemeService,
  getAllSchemesService,
  getActiveSchemesPublicService,
  getSchemeByIdService,
  updateSchemeService,
  deleteSchemeService,
  disableSchemeService,
  enableSchemeService,
};