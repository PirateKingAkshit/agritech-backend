const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateScheme,
  validateUpdateScheme,
  handleValidationErrors,
} = require("../utils/validator");
const {
  createSchemeService,
  getAllSchemesService,
  getSchemeByIdService,
  updateSchemeService,
  deleteSchemeService,
  disableSchemeService,
  enableSchemeService,
} = require("../services/governmentSchemeService");

const createScheme = [
//   validateCreateScheme,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { name, translations } = req.body;
    const parsedTranslations = Array.isArray(translations)
      ? translations
      : JSON.parse(translations || "[]");
    const scheme = await createSchemeService({ name, translations: parsedTranslations }, req.files, req.user);
    res.status(200).json({ message: "Scheme created successfully", data: scheme });
  }),
];

const getAllSchemes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, q = "" } = req.query;
  const result = await getAllSchemesService(parseInt(page), parseInt(limit), q);
  res.status(200).json(result);
});

const getSchemeById = asyncHandler(async (req, res) => {
  const scheme = await getSchemeByIdService(req.params.schemeId);
  res.status(200).json({ message: "Scheme fetched successfully", data: scheme });
});

const updateScheme = [
//   validateUpdateScheme,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { name, translations } = req.body;
    const parsedTranslations = Array.isArray(translations)
      ? translations
      : JSON.parse(translations || "[]");
    const scheme = await updateSchemeService(req.params.id, { name, translations: parsedTranslations }, req.files, req.user);
    res.status(200).json({ message: "Scheme updated successfully", data: scheme });
  }),
];

const deleteScheme = asyncHandler(async (req, res) => {
  const scheme = await deleteSchemeService(req.params.id, req.user);
  res.status(200).json({ message: "Scheme deleted successfully", data: scheme });
});

const disableScheme = asyncHandler(async (req, res) => {
  const scheme = await disableSchemeService(req.params.id, req.user);
  res.status(200).json({ message: "Scheme disabled successfully", data: scheme });
});

const enableScheme = asyncHandler(async (req, res) => {
  const scheme = await enableSchemeService(req.params.id, req.user);
  res.status(200).json({ message: "Scheme enabled successfully", data: scheme });
});

module.exports = {
  createScheme,
  getAllSchemes,
  getSchemeById,
  updateScheme,
  deleteScheme,
  disableScheme,
  enableScheme,
};