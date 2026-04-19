const express          = require("express");
const router           = express.Router();
const reportController = require("../controllers/reportController");
const plCtrl           = require("../controllers/plController");
const dayBookCtrl      = require("../controllers/dayBookController");
const { protect }      = require("../middleware/authMiddleware");

router.use(protect);

// ── Existing reports ──
router.get("/sales",    reportController.getSalesReport);
router.get("/products", reportController.getProductReport);
router.get("/gst",      reportController.getGSTReport);

// ── New reports ──
router.get("/pl",       plCtrl.getPLReport);
router.get("/day-book", dayBookCtrl.getDayBook);

module.exports = router;