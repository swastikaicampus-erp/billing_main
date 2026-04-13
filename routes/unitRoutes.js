const express = require("express");
const router = express.Router();
const { getUnits, createUnit, deleteUnit } = require("../controllers/unitController");
const { protect } = require("../middleware/authMiddleware");

// All routes are protected
router.use(protect);

router.get("/all", getUnits);  // Frontend ke liye matching path
router.post("/add", createUnit);
router.delete("/delete/:id", deleteUnit);

module.exports = router;