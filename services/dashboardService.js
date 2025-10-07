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

  // Prepare regex strings (not RegExp objects — MongoDB handles them inside $regexMatch)
  const partialPattern = `.*${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*`;
  const exactPattern = `^${q}$`;

  // 🔹 SCHEMES: search + ranking
  const schemesPromise = GovernmentScheme.aggregate([
    {
      $match: {
        deleted_at: null,
        isActive: true,
        "translation.name": { $regex: partialPattern, $options: "iu" }
      }
    },
    {
      $addFields: {
        matchedTranslation: {
          $filter: {
            input: "$translation",
            as: "t",
            cond: { $regexMatch: { input: "$$t.name", regex: partialPattern, options: "iu" } }
          }
        }
      }
    },
    {
      $addFields: {
        matchScore: {
          $cond: [
            { $regexMatch: { input: { $arrayElemAt: ["$matchedTranslation.name", 0] }, regex: exactPattern, options: "iu" } },
            2,
            1
          ]
        }
      }
    },
    {
      $project: {
        _id: 0,
        name: { $arrayElemAt: ["$matchedTranslation.name", 0] },
        image: { $arrayElemAt: ["$matchedTranslation.image", 0] },
        description: { $arrayElemAt: ["$matchedTranslation.description", 0] },
        matchScore: 1
      }
    },
    { $sort: { matchScore: -1 } }
  ]);

  // 🔹 TUTORIALS: simple name-based search + ranking
  const tutorialsPromise = TutorialsMaster.aggregate([
    {
      $match: {
        deleted_at: null,
        isActive: true,
        name: { $regex: partialPattern, $options: "iu" }
      }
    },
    {
      $addFields: {
        matchScore: {
          $cond: [
            { $regexMatch: { input: "$name", regex: exactPattern, options: "iu" } },
            2,
            1
          ]
        }
      }
    },
    {
      $project: {
        _id: 0,
        name: 1,
        image: 1,
        description: 1,
        matchScore: 1
      }
    },
    { $sort: { matchScore: -1 } }
  ]);

  // Run both queries in parallel
  const [schemes, tutorials] = await Promise.all([
    schemesPromise,
    tutorialsPromise
  ]);

  return { schemes, tutorials };
};

module.exports.searchDashboardService = searchDashboardService;


