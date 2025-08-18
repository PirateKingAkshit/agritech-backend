const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateTutorial,
  validateUpdateTutorial,
  handleValidationErrors,
} = require("../utils/validator");
const {
  createTutorialService,
  getAllTutorialsService,
  getActiveTutorialsPublicService,
  getTutorialByIdService,
  updateTutorialService,
  deleteTutorialService,
  disableTutorialService,
  enableTutorialService,
} = require("../services/tutorialsMasterService");

const createTutorial = [
  validateCreateTutorial,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    let data = { ...req.body};
    if (req.file) {
      data.image = req.file.path
    }
    const tutorial = await createTutorialService(data, req.user);
    res.status(200).json({ message: "Tutorial created successfully", data: tutorial });
  }),
];

const getAllTutorials = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, q = "" } = req.query;
  const result = await getAllTutorialsService(parseInt(page), parseInt(limit), q);
  res.status(200).json(result);
});

const getActiveTutorialsPublic = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, q = "" } = req.query;
  const { lang } = req.params;
  const result = await getActiveTutorialsPublicService(parseInt(page), parseInt(limit), q, lang );
  res.status(200).json(result);
});

const getTutorialById = asyncHandler(async (req, res) => {
  const tutorial = await getTutorialByIdService(req.params.id);
  res.status(200).json({ message: "Tutorial fetched successfully", data: tutorial });
});

const updateTutorial = [
  validateUpdateTutorial,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    let data = { ...req.body};
    if (req.file) {
      data.image = req.file.path
    }
    const tutorial = await updateTutorialService(req.params.id, data, req.user);
    res.status(200).json({ message: "Tutorial updated successfully", data: tutorial });
  }),
];

const deleteTutorial = asyncHandler(async (req, res) => {
  const tutorial = await deleteTutorialService(req.params.id, req.user);
  res.status(200).json({ message: "Tutorial deleted successfully", data: tutorial });
});

const disableTutorial = asyncHandler(async (req, res) => {
  const tutorial = await disableTutorialService(req.params.id, req.user);
  res.status(200).json({ message: "Tutorial disabled successfully", data: tutorial });
});

const enableTutorial = asyncHandler(async (req, res) => {
  const tutorial = await enableTutorialService(req.params.id, req.user);
  res.status(200).json({ message: "Tutorial enabled successfully", data: tutorial });
});

module.exports = {
  createTutorial,
  getAllTutorials,
  getActiveTutorialsPublic,
  getTutorialById,
  updateTutorial,
  deleteTutorial,
  disableTutorial,
  enableTutorial,
};
