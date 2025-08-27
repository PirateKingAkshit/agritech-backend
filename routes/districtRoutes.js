const express = require("express");
const router = express.Router();
const { getDistrictByStateId } = require("../controllers/districtController");

router.get("/:id", getDistrictByStateId);

module.exports = router;
