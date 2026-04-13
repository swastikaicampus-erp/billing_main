const express = require("express");
const router = express.Router();
const saleController = require("../controllers/salesController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/today-summary", saleController.getTodaySummary);
router.get("/all", saleController.getSales);        // ✅ /all?limit=5 kaam karega
router.post("/create", saleController.createSale);
router.patch("/cancel/:id", saleController.cancelSale);      // ✅ patch pe hai, get /:id se conflict nahi
router.get("/:id", saleController.getSale);

module.exports = router;