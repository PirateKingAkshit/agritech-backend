const CropMaster = require("../models/cropMasterModel");
const ProductMaster = require("../models/productMasterModel");
const GovernmentScheme = require("../models/governmentSchemeModel");
const TutorialsMaster = require("../models/tutorialsMasterModel");
const CropSaleRequest = require("../models/cropSaleRequestModel");
const Error = require("../utils/error");

function normalizeFromDate(from) {
  const date = new Date(from);
  if (isNaN(date)) return NaN;
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeToDate(to) {
  const date = new Date(to);
  if (isNaN(date)) return NaN;
  date.setHours(23, 59, 59, 999);
  return date;
}

function buildCreatedAtFilter(from, to) {
  const createdAt = {};
  if (from) {
    const fromDate = normalizeFromDate(from);
    if (isNaN(fromDate)) {
      throw new Error("Invalid 'from' date", 400);
    }
    createdAt.$gte = fromDate;
  }
  if (to) {
    const toDate = normalizeToDate(to);
    if (isNaN(toDate)) {
      throw new Error("Invalid 'to' date", 400);
    }
    createdAt.$lte = toDate;
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
}

const getDashboardStatsService = async (requestingUser, { from, to } = {}) => {
  if (requestingUser.role !== "Admin") {
    throw new Error("Unauthorized", 403);
  }

  const createdAtFilter = buildCreatedAtFilter(from, to);
  const commonFilter = { deleted_at: null, ...createdAtFilter };

  const [
    crops,
    products,
    governmentSchemes,
    tutorials,
    cropSaleRequests,
  ] = await Promise.all([
    CropMaster.countDocuments(commonFilter),
    ProductMaster.countDocuments(commonFilter),
    GovernmentScheme.countDocuments(commonFilter),
    TutorialsMaster.countDocuments(commonFilter),
    CropSaleRequest.countDocuments({ deleted_at: null, ...createdAtFilter }),
  ]);

  return {
    crops,
    products,
    governmentSchemes,
    tutorials,
    cropSaleRequests,
  };
};

module.exports = { getDashboardStatsService };


