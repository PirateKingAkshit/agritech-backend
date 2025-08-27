const express = require("express");
const router = express.Router();
const { getMarketByDistrictId } = require("../controllers/marketController");

router.get("/:id", getMarketByDistrictId);

module.exports = router;
