
// GET /api/reports/pl?from=&to=
exports.getPLReport = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const from   = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to     = req.query.to   ? new Date(new Date(req.query.to).setHours(23,59,59)) : new Date();

    const dateFilter      = { $gte: from, $lte: to };
    const saleDateFilter  = { shopId, createdAt: dateFilter, status: { $ne: "Cancelled" } };
    const purDateFilter   = { shopId, purchaseDate: dateFilter, status: { $ne: "Cancelled" } };
    const expDateFilter   = { shopId, date: dateFilter };
    const srDateFilter    = { shopId, returnDate: dateFilter };

    const [salesAgg, purchasesAgg, expensesAgg, saleReturnsAgg, purchaseReturnsAgg, cogs] = await Promise.all([
      // Total Revenue
      SaleModel.aggregate([
        { $match: saleDateFilter },
        { $group: { _id: null, revenue: { $sum: "$grandTotal" }, tax: { $sum: "$taxAmount" }, discount: { $sum: "$discountAmount" } } },
      ]),
      // Total Purchase cost
      PurchaseModel.aggregate([
        { $match: purDateFilter },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      // Total Expenses
      ExpenseModel.aggregate([
        { $match: expDateFilter },
        { $group: { _id: null, total: { $sum: "$amount" }, byCategory: { $push: { cat: "$category", amt: "$amount" } } } },
      ]),
      // Sale Returns
      SaleReturnModel.aggregate([
        { $match: srDateFilter },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      // Purchase Returns
      PurchaseReturnModel.aggregate([
        { $match: { shopId, returnDate: dateFilter } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      // COGS from sale items (purchase price × qty sold)
      SaleModel.aggregate([
        { $match: saleDateFilter },
        { $unwind: "$items" },
        { $group: { _id: null, cogs: { $sum: { $multiply: ["$items.purchasePrice", "$items.quantity"] } } } },
      ]),
    ]);

    const revenue         = salesAgg[0]?.revenue         || 0;
    const salesTax        = salesAgg[0]?.tax             || 0;
    const salesDiscount   = salesAgg[0]?.discount        || 0;
    const purchaseCost    = purchasesAgg[0]?.total       || 0;
    const totalExpenses   = expensesAgg[0]?.total        || 0;
    const saleReturns     = saleReturnsAgg[0]?.total     || 0;
    const purchaseReturns = purchaseReturnsAgg[0]?.total || 0;
    const cogsAmount      = cogs[0]?.cogs                || 0;

    // Expense by category
    const expByCategory = {};
    (expensesAgg[0]?.byCategory || []).forEach(({ cat, amt }) => {
      expByCategory[cat] = (expByCategory[cat] || 0) + amt;
    });

    const netRevenue    = revenue - saleReturns;
    const netPurchase   = purchaseCost - purchaseReturns;
    const grossProfit   = netRevenue - cogsAmount;
    const netProfit     = grossProfit - totalExpenses;

    res.json({
      success: true,
      report: {
        period:     { from, to },
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
        profitMargin: netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(2) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ═══════════════════════════════════════════════════════════════
// controllers/dayBookController.js
// ═══════════════════════════════════════════════════════════════
const PaymentModel = require("../models/Payment");

// GET /api/reports/day-book?date=2025-01-15
exports.getDayBook = async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const date   = req.query.date ? new Date(req.query.date) : new Date();
    const start  = new Date(date); start.setHours(0,0,0,0);
    const end    = new Date(date); end.setHours(23,59,59,999);
    const dFilter = { $gte: start, $lte: end };

    const [sales, purchases, expenses, payments, saleReturns, purchaseReturns] = await Promise.all([
      SaleModel.find({ shopId, createdAt: dFilter, status: { $ne: "Cancelled" } })
        .select("invoiceNumber customerName grandTotal amountPaid dueAmount paymentMode createdAt"),
      PurchaseModel.find({ shopId, purchaseDate: dFilter, status: { $ne: "Cancelled" } })
        .populate("supplier", "name")
        .select("purchaseNumber supplier grandTotal paidAmount dueAmount paymentMode purchaseDate"),
      ExpenseModel.find({ shopId, date: dFilter })
        .select("category amount paymentMode description date"),
      PaymentModel.find({ shopId, date: dFilter })
        .select("type partyType partyName amount paymentMode reference date"),
      SaleReturnModel.find({ shopId, returnDate: dFilter })
        .select("returnNumber customerName totalAmount refundMode returnDate"),
      PurchaseReturnModel.find({ shopId, returnDate: dFilter })
        .select("returnNumber totalAmount refundMode returnDate"),
    ]);

    // Cash flow
    const cashIn =
      sales.filter(s => s.paymentMode === "Cash").reduce((a, s) => a + s.amountPaid, 0) +
      payments.filter(p => p.type === "PaymentIn" && p.paymentMode === "Cash").reduce((a, p) => a + p.amount, 0);

    const cashOut =
      purchases.filter(p => p.paymentMode === "Cash").reduce((a, p) => a + p.paidAmount, 0) +
      expenses.filter(e => e.paymentMode === "Cash").reduce((a, e) => a + e.amount, 0) +
      payments.filter(p => p.type === "PaymentOut" && p.paymentMode === "Cash").reduce((a, p) => a + p.amount, 0);

    res.json({
      success: true,
      date:    start,
      summary: {
        totalSales:      sales.reduce((a, s) => a + s.grandTotal, 0),
        totalPurchases:  purchases.reduce((a, p) => a + p.grandTotal, 0),
        totalExpenses:   expenses.reduce((a, e) => a + e.amount, 0),
        totalPaymentsIn: payments.filter(p=>p.type==="PaymentIn").reduce((a,p)=>a+p.amount,0),
        totalPaymentsOut:payments.filter(p=>p.type==="PaymentOut").reduce((a,p)=>a+p.amount,0),
        cashIn,
        cashOut,
        netCash: cashIn - cashOut,
      },
      sales,
      purchases,
      expenses,
      payments,
      saleReturns,
      purchaseReturns,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};