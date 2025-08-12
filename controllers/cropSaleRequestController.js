const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateCreateCropSaleRequest,
  validateUpdateCropSaleRequestUser,
  validateUpdateCropSaleRequestStatus,
  validatePagination,
  handleValidationErrors,
} = require("../utils/validator");
const {
  createSaleRequestService,
  getMySaleRequestsService,
  getAllSaleRequestsService,
  getSaleRequestByIdService,
  updateSaleRequestUserService,
  updateSaleRequestStatusService,
} = require("../services/cropSaleRequestService");

const createSaleRequest = [
  validateCreateCropSaleRequest,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const request = await createSaleRequestService(req.body, req.user);
    res.status(200).json({ message: "Sale request created", data: request });
  }),
];

const getMySaleRequests = [
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, q = "" } = req.query;
    const result = await getMySaleRequestsService(req.user, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      q,
    });
    res.status(200).json(result);
  }),
];

const getAllSaleRequests = [
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, q = "" } = req.query;
    const result = await getAllSaleRequestsService(req.user, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      q,
    });
    res.status(200).json(result);
  }),
];

const getSaleRequestById = asyncHandler(async (req, res) => {
  const data = await getSaleRequestByIdService(req.params.id, req.user);
  res.status(200).json({ message: "Sale request fetched", data });
});

const updateSaleRequestUser = [
  validateUpdateCropSaleRequestUser,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const updated = await updateSaleRequestUserService(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({ message: "Sale request updated", data: updated });
  }),
];

const updateSaleRequestStatus = [
  validateUpdateCropSaleRequestStatus,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const updated = await updateSaleRequestStatusService(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({ message: "Sale request updated by admin", data: updated });
  }),
];

module.exports = {
  createSaleRequest,
  getMySaleRequests,
  getAllSaleRequests,
  getSaleRequestById,
  updateSaleRequestUser,
  updateSaleRequestStatus,
};


