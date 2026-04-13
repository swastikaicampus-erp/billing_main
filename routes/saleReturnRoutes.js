const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/saleReturnController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.post("/add",   ctrl.createSaleReturn);
router.get("/all",    ctrl.getSaleReturns);
router.get("/:id",    ctrl.getSaleReturn);

module.exports = router;