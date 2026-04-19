const mongoose        = require("mongoose");
const Sale            = require("../models/Sale");
const Purchase        = require("../models/Purchase");
const Expense         = require("../models/Expense");

// ── Optional models — agar nahi hain toh gracefully skip ho jayenge ──
let SaleReturn, PurchaseReturn;
try { SaleReturn    = require("../models/SaleReturn");    } catch (_) { SaleReturn    = null; }
try { PurchaseReturn = require("../models/PurchaseReturn"); } catch (_) { PurchaseReturn = null; }

// ─────────────────────────────────────────────────────────────────────
// GET /api/reports/pl?from=YYYY-MM-DD&to=YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────
exports.getPLReport = async (req, res) => {
  try {
    const shopId = req.user.shopId;

    // ── Date range ──
    const from = req.query.from
      ? new Date(req.query.from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const to = req.query.to
      ? new Date(new Date(req.query.to).setHours(23, 59, 59, 999))
      : new Date();

    const saleDateFilter = {
      shopId,
      createdAt:    { $gte: from, $lte: to },
      status:       { $ne: "Cancelled" },
    };
    const purDateFilter = {
      shopId,
      purchaseDate: { $gte: from, $lte: to },
      status:       { $ne: "Cancelled" },
    };
    const expDateFilter = {
      shopId,
      date: { $gte: from, $lte: to },
    };

    // ── All aggregations in parallel ──
    const promises = [
      // 0 — Revenue
      Sale.aggregate([
        { $match: saleDateFilter },
        {
          $group: {
            _id:      null,
            revenue:  { $sum: "$grandTotal" },
            tax:      { $sum: "$taxAmount" },
            discount: { $sum: "$discountAmount" },
          },
        },
      ]),

      // 1 — Purchase cost
      Purchase.aggregate([
        { $match: purDateFilter },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),

      // 2 — Expenses
      Expense.aggregate([
        { $match: expDateFilter },
        {
          $group: {
            _id:        null,
            total:      { $sum: "$amount" },
            byCategory: {
              $push: { cat: "$category", amt: "$amount" },
            },
          },
        },
      ]),

      // 3 — COGS (purchase price × qty sold, stored in sale items)
      Sale.aggregate([
        { $match: saleDateFilter },
        { $unwind: "$items" },
        {
          $group: {
            _id:  null,
            cogs: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$items.purchasePrice", 0] },
                  "$items.quantity",
                ],
              },
            },
          },
        },
      ]),

      // 4 — Sale returns (optional)
      SaleReturn
        ? SaleReturn.aggregate([
            { $match: { shopId, returnDate: { $gte: from, $lte: to } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ])
        : Promise.resolve([]),

      // 5 — Purchase returns (optional)
      PurchaseReturn
        ? PurchaseReturn.aggregate([
            { $match: { shopId, returnDate: { $gte: from, $lte: to } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ])
        : Promise.resolve([]),
    ];

    const [salesAgg, purchasesAgg, expensesAgg, cogsAgg, saleRetAgg, purRetAgg] =
      await Promise.all(promises);

    // ── Extract values ──
    const revenue         = salesAgg[0]?.revenue         || 0;
    const salesTax        = salesAgg[0]?.tax             || 0;
    const salesDiscount   = salesAgg[0]?.discount        || 0;
    const purchaseCost    = purchasesAgg[0]?.total       || 0;
    const totalExpenses   = expensesAgg[0]?.total        || 0;
    const cogsAmount      = cogsAgg[0]?.cogs             || 0;
    const saleReturns     = saleRetAgg[0]?.total         || 0;
    const purchaseReturns = purRetAgg[0]?.total          || 0;

    // ── Expense breakdown by category ──
    const expByCategory = {};
    (expensesAgg[0]?.byCategory || []).forEach(({ cat, amt }) => {
      expByCategory[cat] = (expByCategory[cat] || 0) + amt;
    });

    // ── P&L calculations ──
    const netRevenue  = revenue - saleReturns;
    const netPurchase = purchaseCost - purchaseReturns;
    const grossProfit = netRevenue - (cogsAmount || netPurchase); // fallback to purchase cost if no COGS
    const netProfit   = grossProfit - totalExpenses;
    const profitMargin = netRevenue > 0
      ? ((netProfit / netRevenue) * 100).toFixed(2)
      : "0.00";

    res.json({
      success: true,
      report: {
        period: { from, to },
        revenue,
        salesDiscount,
        salesTax,
        saleReturns,
        netRevenue,
        purchaseCost,
        purchaseReturns,
        netPurchase,
        cogsAmount,
        grossProfit,
        totalExpenses,
        expByCategory,
        netProfit,
        profitMargin,
      },
    });
  } catch (err) {
    console.error("PL Report Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};