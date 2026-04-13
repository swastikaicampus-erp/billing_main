// routes/purchaseRoutes.js
const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/purchaseController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/add",           ctrl.createPurchase);
router.get("/all",            ctrl.getPurchases);
router.get("/:id",            ctrl.getPurchase);
router.patch("/cancel/:id",   ctrl.cancelPurchase);

module.exports = router;