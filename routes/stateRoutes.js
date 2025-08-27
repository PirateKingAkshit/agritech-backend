const express = require("express");
const router = express.Router();
const { getAllStates } = require("../controllers/stateController");

router.get("/", getAllStates);

module.exports = router;
