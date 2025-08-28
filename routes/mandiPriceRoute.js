const express = require("express");
const { getMandiPrice } = require("../controllers/mandiPriceController");
const router = express.Router();


// Route to get mandi price
router.get("/", getMandiPrice);

module.exports = router;
