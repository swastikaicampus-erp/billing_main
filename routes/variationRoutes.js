const express = require("express");
const router = express.Router();

const {
  createVariation,
  getAllVariations,
  deleteVariation
} = require("../controllers/variationController");

const { protect } = require("../middleware/authMiddleware");

// create
router.post("/add", protect, createVariation);

// get
router.get("/all", protect, getAllVariations);

// delete
router.delete("/delete/:id", protect, deleteVariation);

module.exports = router;