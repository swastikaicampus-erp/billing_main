const express = require("express");
const router = express.Router();

const {
  createBrand,
  getAllBrands,
  deleteBrand,
  updateBrand
} = require("../controllers/brandController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// create
router.post("/add", protect, upload.single("logo"), createBrand);

// get
router.get("/all", protect, getAllBrands);

// update
router.put("/update/:id", protect, upload.single("logo"), updateBrand);

// delete
router.delete("/delete/:id", protect, deleteBrand);

module.exports = router;