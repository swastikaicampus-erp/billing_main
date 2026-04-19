const mongoose = require("mongoose");
const Sale     = require("../models/Sale");
const Purchase = require("../models/Purchase");
const Product  = require("../models/Product");
const Customer = require("../models/Customer");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
}
function monthRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
function yearRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/stats
// ────────────────────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const shopId = new mongoose.Types.ObjectId(req.user.shopId);
    const { start: todayStart, end: todayEnd } = todayRange();
    const { start: monthStart, end: monthEnd } = monthRange();
    const { start: yearStart,  end: yearEnd  } = yearRange();

    const [
      todaySalesAgg,
      todayBills,
      todayPurchaseAgg,
      monthSalesAgg,
      monthPurchaseAgg,
      yearSalesAgg,
      yearPurchaseAgg,
      totalProducts,
      totalCustomers,
      totalDueAgg,
      lowStockCount,
    ] = await Promise.all([
      // Today sales — field: grandTotal
      Sale.aggregate([
        { $match: { shopId, status: { $ne: "Cancelled" }, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Sale.countDocuments({ shopId, status: { $ne: "Cancelled" }, createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Purchase.aggregate([
        { $match: { shopId, status: { $ne: "Cancelled" }, purchaseDate: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      // Month
      Sale.aggregate([
        { $match: { shopId, status: { $ne: "Cancelled" }, createdAt: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Purchase.aggregate([
        { $match: { shopId, status: { $ne: "Cancelled" }, purchaseDate: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      // Year
      Sale.aggregate([
        { $match: { shopId, status: { $ne: "Cancelled" }, createdAt: { $gte: yearStart, $lte: yearEnd } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Purchase.aggregate([
        { $match: { shopId, status: { $ne: "Cancelled" }, purchaseDate: { $gte: yearStart, $lte: yearEnd } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Product.countDocuments({ shopId, isActive: true }),
      Customer.countDocuments({ shopId }),
      Customer.aggregate([
        { $match: { shopId } },
        { $group: { _id: null, total: { $sum: "$totalDue" } } },
      ]),
      Product.countDocuments({
        shopId,
        $expr: { $lte: ["$openingStock", "$quantityAlert"] },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        todaySales:     todaySalesAgg[0]?.total    ?? 0,
        todayBills,
        todayPurchases: todayPurchaseAgg[0]?.total ?? 0,
        monthSales:     monthSalesAgg[0]?.total    ?? 0,
        monthPurchases: monthPurchaseAgg[0]?.total ?? 0,
        yearSales:      yearSalesAgg[0]?.total     ?? 0,
        yearPurchases:  yearPurchaseAgg[0]?.total  ?? 0,
        totalProducts,
        totalCustomers,
        totalDue:       totalDueAgg[0]?.total      ?? 0,
        lowStockCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/monthly-chart?period=3|6|12
// ────────────────────────────────────────────────────────────────────────────
exports.getMonthlyChart = async (req, res) => {
  try {
    const shopId = new mongoose.Types.ObjectId(req.user.shopId);
    const months_back = parseInt(req.query.period) || 6; // 3, 6, or 12
    const now     = new Date();

    const months = [];
    for (let i = months_back - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year:  d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
      });
    }

    const startDate = new Date(now.getFullYear(), now.getMonth() - (months_back - 1), 1);

    const [salesAgg, purchaseAgg] = await Promise.all([
      Sale.aggregate([
        { $match: { shopId, status: { $ne: "Cancelled" }, createdAt: { $gte: startDate } } },
        { $group: {
            _id:   { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            total: { $sum: "$grandTotal" },
        }},
      ]),
      Purchase.aggregate([
        { $match: { shopId, status: { $ne: "Cancelled" }, purchaseDate: { $gte: startDate } } },
        { $group: {
            _id:   { year: { $year: "$purchaseDate" }, month: { $month: "$purchaseDate" } },
            total: { $sum: "$grandTotal" },
        }},
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
// ────────────────────────────────────────────────────────────────────────────
exports.getDailyChart = async (req, res) => {
  try {
    const shopId = new mongoose.Types.ObjectId(req.user.shopId);
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 29);
    thirtyAgo.setHours(0, 0, 0, 0);

    const [salesAgg, purchaseAgg] = await Promise.all([
      Sale.aggregate([
        { $match: { shopId, status: { $ne: "Cancelled" }, createdAt: { $gte: thirtyAgo } } },
        { $group: {
            _id:   { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$grandTotal" },
        }},
        { $sort: { _id: 1 } },
      ]),
      Purchase.aggregate([
        { $match: { shopId, status: { $ne: "Cancelled" }, purchaseDate: { $gte: thirtyAgo } } },
        { $group: {
            _id:   { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" } },
            total: { $sum: "$grandTotal" },
        }},
        { $sort: { _id: 1 } },
      ]),
    ]);

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
// ────────────────────────────────────────────────────────────────────────────
exports.getTopProducts = async (req, res) => {
  try {
    const shopId = new mongoose.Types.ObjectId(req.user.shopId);

    const products = await Sale.aggregate([
      { $match: { shopId, status: { $ne: "Cancelled" } } },
      { $unwind: "$items" },
      { $group: {
          _id:          "$items.product",
          name:         { $first: "$items.productName" },   // snapshot name use karo
          totalQty:     { $sum: "$items.quantity" },         // field: quantity
          totalRevenue: { $sum: "$items.subtotal" },         // field: subtotal
      }},
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      { $project: { name: 1, totalQty: 1, totalRevenue: 1 } },
    ]);

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};