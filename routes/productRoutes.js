const express = require("express");
const router  = express.Router();
const productController = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.use(protect);

// ✅ Specific routes PEHLE, param routes BAAD MEIN
router.get("/stock-alerts",     productController.getStockAlerts);
router.get("/adjustments/all",  productController.getAdjustments);

router.post("/add",             upload.single("image"), productController.createProduct);
router.get("/all",              productController.getProducts);
router.post("/adjust-stock",    productController.adjustStock);

// ✅ Param routes SABSE NEECHE
router.get("/:id",              productController.getProduct);
router.put("/update/:id",       upload.single("image"), productController.updateProduct);
router.delete("/delete/:id",    productController.deleteProduct);

module.exports = router;