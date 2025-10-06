const CropMaster = require("../models/cropMasterModel");
const ProductMaster = require("../models/productMasterModel");
const GovernmentScheme = require("../models/governmentSchemeModel");
const TutorialsMaster = require("../models/tutorialsMasterModel");
const CropSaleRequest = require("../models/cropSaleRequestModel");
const ProductOrderRequest = require("../models/productOrderModel");
const ApiError = require("../utils/error");

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
      throw new ApiError("Invalid 'from' date", 400);
    }
    createdAt.$gte = fromDate;
  }
  if (to) {
    const toDate = normalizeToDate(to);
    if (isNaN(toDate)) {
      throw new ApiError("Invalid 'to' date", 400);
    }
    createdAt.$lte = toDate;
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
}

const getDashboardStatsService = async (requestingUser, { from, to } = {}) => {
  if (requestingUser.role !== "Admin") {
    throw new ApiError("Unauthorized", 403);
  }

  const createdAtFilter = buildCreatedAtFilter(from, to);
  const commonFilter = { deleted_at: null, ...createdAtFilter };

  const [
    crops,
    products,
    governmentSchemes,
    tutorials,
    cropSaleRequests,
    productOrderRequests,
  ] = await Promise.all([
    CropMaster.countDocuments(commonFilter),
    ProductMaster.countDocuments(commonFilter),
    GovernmentScheme.countDocuments(commonFilter),
    TutorialsMaster.countDocuments(commonFilter),
    CropSaleRequest.countDocuments(commonFilter),
    ProductOrderRequest.countDocuments(commonFilter),
  ]);

  return {
    crops,
    products,
    governmentSchemes,
    tutorials,
    cropSaleRequests,
    productOrderRequests,
  };
};

module.exports = { getDashboardStatsService };

// Search across schemes and tutorials
const searchDashboardService = async (requestingUser, query, lang) => {
  if (!query || !query.trim()) {
    return { schemes: [], tutorials: [] };
  }

  const q = query.trim();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  // Build scheme filter
  const schemeFilter = { deleted_at: null, isActive: true };
  if (lang && lang.trim()) {
    schemeFilter["translation.language"] = lang.trim();
    schemeFilter.$or = [
      { "translation.name": regex },
    ];
  } else {
    schemeFilter.$or = [
      { name: regex },
      { "translation.name": regex },
    ];
  }

  // Build tutorial filter
  const tutorialFilter = { deleted_at: null, isActive: true };
  if (lang && lang.trim()) {
    tutorialFilter.language = lang.trim();
    tutorialFilter.$or = [{ name: regex }];
  } else {
    tutorialFilter.$or = [{ name: regex }];
  }

  // If lang is provided, only include that translation in response
  const schemesPromise = lang && lang.trim()
    ? GovernmentScheme.aggregate([
        { $match: schemeFilter },
        {
          $addFields: {
            translation: {
              $filter: {
                input: "$translation",
                as: "t",
                cond: { $eq: ["$$t.language", lang.trim()] },
              },
            },
          },
        },
      ])
    : GovernmentScheme.find(schemeFilter).lean();

  const [schemes, tutorials] = await Promise.all([
    schemesPromise,
    TutorialsMaster.find(tutorialFilter).lean(),
  ]);

  return { schemes, tutorials };
};

module.exports.searchDashboardService = searchDashboardService;


