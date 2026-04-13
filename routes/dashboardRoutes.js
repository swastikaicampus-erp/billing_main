// routes/dashboardRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/stats",         ctrl.getStats);
router.get("/monthly-chart", ctrl.getMonthlyChart);
router.get("/daily-chart",   ctrl.getDailyChart);
router.get("/top-products",  ctrl.getTopProducts);

module.exports = router;


// ─────────────────────────────────────────────────────────────────────────────
// Customer model mein ye 2 fields honi chahiye (agar nahi hai toh add karo):
// ─────────────────────────────────────────────────────────────────────────────
//
// totalPaid: { type: Number, default: 0 },
// totalDue:  { type: Number, default: 0 },
//
// ─────────────────────────────────────────────────────────────────────────────
// customerRoutes.js mein ye route add karo:
// ─────────────────────────────────────────────────────────────────────────────
//
// router.get("/udhaar", async (req, res) => {
//   try {
//     const customers = await Customer.find({
//       shopId:   req.user.shopId,
//       totalDue: { $gt: 0 },
//     })
//     .select("name phone totalDue")
//     .sort({ totalDue: -1 })
//     .limit(10);
//
//     res.json({ success: true, customers });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });
//
// ─────────────────────────────────────────────────────────────────────────────
// purchases/all mein limit support add karo (purchaseRoutes.js controller):
// ─────────────────────────────────────────────────────────────────────────────
//
// const limit = parseInt(req.query.limit) || 0;   // 0 = no limit
// const purchases = await Purchase.find(filter)
//   .populate("supplier", "name phone")
//   .populate("items.product", "name itemCode")
//   .sort({ createdAt: -1 })
//   .limit(limit);                                  // ← add this line
//
// ─────────────────────────────────────────────────────────────────────────────
// app.js mein add karo:
// ─────────────────────────────────────────────────────────────────────────────
//
// app.use("/api/dashboard", require("./routes/dashboardRoutes"));