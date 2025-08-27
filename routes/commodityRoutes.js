const express = require("express");
const router = express.Router();
const {
  getCommodityByMarketId,
} = require("../controllers/commodityController");

router.get("/:id", getCommodityByMarketId);

module.exports = router;
