const express = require("express");
const router = express.Router();

const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");


// create
router.post(
  "/add",
  protect,
  upload.single("logo"),
  createCategory
);

// get
router.get(
  "/all",
  protect,
  getAllCategories
);

// update
router.put(
  "/update/:id",
  protect,
  upload.single("logo"),
  updateCategory
);

// delete
router.delete(
  "/delete/:id",
  protect,
  deleteCategory
);

module.exports = router;