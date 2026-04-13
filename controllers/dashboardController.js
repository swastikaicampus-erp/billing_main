// controllers/dashboardController.js
const Sale     = require("../models/Sale");     
const Purchase = require("../models/Purchase");
const Product  = require("../models/Product");
const Customer = require("../models/Customer");

// ─── Helper: start/end of today ──────────────────────────────────────────────
function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ─── Helper: start/end of current month ──────────────────────────────────────
function monthRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/stats
// ────────────────────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const shopId    = req.user.shopId;
    const { start: todayStart, end: todayEnd }   = todayRange();
    const { start: monthStart, end: monthEnd }   = monthRange();

    const [
      todaySalesAgg,
      todayBills,
      todayPurchaseAgg,
      monthSalesAgg,
      monthPurchaseAgg,
      totalProducts,
      totalCustomers,
      totalDueAgg,
      lowStockCount,
    ] = await Promise.all([
      // Today's total sales
      Sale.aggregate([
        { $match: { shopId, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      // Today's bill count
      Sale.countDocuments({ shopId, createdAt: { $gte: todayStart, $lte: todayEnd } }),
      // Today's purchase total
      Purchase.aggregate([
        { $match: { shopId, purchaseDate: { $gte: todayStart, $lte: todayEnd }, status: { $ne: "Cancelled" } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      // Month sales
      Sale.aggregate([
        { $match: { shopId, createdAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      // Month purchases
      Purchase.aggregate([
        { $match: { shopId, purchaseDate: { $gte: monthStart, $lte: monthEnd }, status: { $ne: "Cancelled" } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Product.countDocuments({ shopId, isActive: true }),
      Customer.countDocuments({ shopId }),
      // Total customer due
      Customer.aggregate([
        { $match: { shopId } },
        { $group: { _id: null, total: { $sum: "$totalDue" } } },
      ]),
      // Low stock count
      Product.countDocuments({
        shopId,
        $expr: { $lte: ["$openingStock", "$quantityAlert"] },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        todaySales:     todaySalesAgg[0]?.total     ?? 0,
        todayBills,
        todayPurchases: todayPurchaseAgg[0]?.total  ?? 0,
        monthSales:     monthSalesAgg[0]?.total      ?? 0,
        monthPurchases: monthPurchaseAgg[0]?.total   ?? 0,
        totalProducts,
        totalCustomers,
        totalDue:       totalDueAgg[0]?.total        ?? 0,
        lowStockCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/monthly-chart
// Last 6 months — Sales vs Purchases
// ────────────────────────────────────────────────────────────────────────────
exports.getMonthlyChart = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const now    = new Date();

    // Build last 6 months labels
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year:  d.getFullYear(),
        month: d.getMonth() + 1, // 1-indexed
        label: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
      });
    }

    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [salesAgg, purchaseAgg] = await Promise.all([
      Sale.aggregate([
        { $match: { shopId, createdAt: { $gte: startDate } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, total: { $sum: "$total" } } },
      ]),
      Purchase.aggregate([
        { $match: { shopId, purchaseDate: { $gte: startDate }, status: { $ne: "Cancelled" } } },
        { $group: { _id: { year: { $year: "$purchaseDate" }, month: { $month: "$purchaseDate" } }, total: { $sum: "$grandTotal" } } },
      ]),
    ]);

    const data = months.map(m => {
      const s = salesAgg.find(x => x._id.year === m.year && x._id.month === m.month);
      const p = purchaseAgg.find(x => x._id.year === m.year && x._id.month === m.month);
      return { label: m.label, sales: s?.total ?? 0, purchases: p?.total ?? 0 };
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/daily-chart
// Last 30 days — daily Sales vs Purchases
// ────────────────────────────────────────────────────────────────────────────
exports.getDailyChart = async (req, res) => {
  try {
    const shopId    = req.user.shopId;
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 29);
    thirtyAgo.setHours(0, 0, 0, 0);

    const [salesAgg, purchaseAgg] = await Promise.all([
      Sale.aggregate([
        { $match: { shopId, createdAt: { $gte: thirtyAgo } } },
        { $group: {
            _id:   { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$total" },
        }},
        { $sort: { _id: 1 } },
      ]),
      Purchase.aggregate([
        { $match: { shopId, purchaseDate: { $gte: thirtyAgo }, status: { $ne: "Cancelled" } } },
        { $group: {
            _id:   { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" } },
            total: { $sum: "$grandTotal" },
        }},
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Build 30 days array
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d   = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const lbl = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const s   = salesAgg.find(x => x._id === key);
      const p   = purchaseAgg.find(x => x._id === key);
      days.push({ label: lbl, sales: s?.total ?? 0, purchases: p?.total ?? 0 });
    }

    res.json({ success: true, data: days });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/top-products
// Top 5 selling products (by revenue)
// ────────────────────────────────────────────────────────────────────────────
exports.getTopProducts = async (req, res) => {
  try {
    const shopId = req.user.shopId;

    // ⚠️  Adjust field names to match YOUR Sale/SaleItem model
    // Assumes Sale has items[] with { product (ObjectId), qty, price }
    const products = await Sale.aggregate([
      { $match: { shopId } },
      { $unwind: "$items" },
      { $group: {
          _id:          "$items.product",
          totalQty:     { $sum: "$items.qty" },
          totalRevenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
      }},
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      { $lookup: {
          from:         "products",
          localField:   "_id",
          foreignField: "_id",
          as:           "info",
      }},
      { $unwind: "$info" },
      { $project: {
          name:         "$info.name",
          totalQty:     1,
          totalRevenue: 1,
      }},
    ]);

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};