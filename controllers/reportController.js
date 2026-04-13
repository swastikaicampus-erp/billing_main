const Sale    = require("../models/Sale");
const Product = require("../models/Product");

// ─── SALES REPORT (date-wise) ─────────────────────────────────────
exports.getSalesReport = async (req, res) => {
  try {
    const { from, to, groupBy = "day" } = req.query;

    const start = from ? new Date(from) : new Date(new Date().setDate(1)); // default: is mahine ka pehla din
    const end   = to   ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();

    const filter = {
      shopId:    req.user.shopId,
      status:    { $ne: "Cancelled" },
      createdAt: { $gte: start, $lte: end },
    };

    // ─── Group by day / month / year ───
    const dateFormat =
      groupBy === "month" ? "%Y-%m" :
      groupBy === "year"  ? "%Y"    : "%Y-%m-%d";

    const grouped = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id:           { $dateToString: { format: dateFormat, date: "$createdAt" } },
          totalSales:    { $sum: 1 },
          totalRevenue:  { $sum: "$grandTotal" },
          totalTax:      { $sum: "$taxAmount" },
          totalDiscount: { $sum: "$discountAmount" },
          cashSales:     { $sum: { $cond: [{ $eq: ["$paymentMode", "Cash"] }, "$grandTotal", 0] } },
          upiSales:      { $sum: { $cond: [{ $eq: ["$paymentMode", "UPI"]  }, "$grandTotal", 0] } },
          cardSales:     { $sum: { $cond: [{ $eq: ["$paymentMode", "Card"] }, "$grandTotal", 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ─── Overall totals ───
    const totals = grouped.reduce(
      (acc, row) => ({
        totalSales:    acc.totalSales    + row.totalSales,
        totalRevenue:  acc.totalRevenue  + row.totalRevenue,
        totalTax:      acc.totalTax      + row.totalTax,
        totalDiscount: acc.totalDiscount + row.totalDiscount,
      }),
      { totalSales: 0, totalRevenue: 0, totalTax: 0, totalDiscount: 0 }
    );

    res.json({ success: true, grouped, totals, from: start, to: end });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PRODUCT-WISE REPORT ──────────────────────────────────────────
exports.getProductReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    const start = from ? new Date(from) : new Date(new Date().setDate(1));
    const end   = to   ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();

    const filter = {
      shopId:    req.user.shopId,
      status:    { $ne: "Cancelled" },
      createdAt: { $gte: start, $lte: end },
    };

    const report = await Sale.aggregate([
      { $match: filter },
      { $unwind: "$items" },
      {
        $group: {
          _id:          "$items.product",
          productName:  { $first: "$items.productName" },
          itemCode:     { $first: "$items.itemCode" },
          totalQty:     { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
          totalTax:     { $sum: "$items.taxAmount" },
          avgPrice:     { $avg: "$items.sellingPrice" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 100 },
    ]);

    res.json({ success: true, report, from: start, to: end });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GST REPORT ───────────────────────────────────────────────────
exports.getGSTReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    const start = from ? new Date(from) : new Date(new Date().setDate(1));
    const end   = to   ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();

    const filter = {
      shopId:    req.user.shopId,
      status:    { $ne: "Cancelled" },
      createdAt: { $gte: start, $lte: end },
    };

    // GST slab-wise breakdown
    const slabReport = await Sale.aggregate([
      { $match: filter },
      { $unwind: "$items" },
      {
        $group: {
          _id:         "$items.taxPercent",
          taxableAmt:  { $sum: { $multiply: [
            { $subtract: ["$items.sellingPrice", { $multiply: ["$items.sellingPrice", { $divide: ["$items.discount", 100] }] }] },
            "$items.quantity"
          ]}},
          taxAmount:   { $sum: "$items.taxAmount" },
          totalItems:  { $sum: "$items.quantity" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // CGST = SGST = taxAmount / 2 (same state)
    const slabs = slabReport.map(s => ({
      taxPercent: s._id,
      taxableAmt: s.taxableAmt,
      cgst:       s.taxAmount / 2,
      sgst:       s.taxAmount / 2,
      igst:       0,              // inter-state ke liye extend karo baad mein
      totalTax:   s.taxAmount,
      totalItems: s.totalItems,
    }));

    const totals = slabs.reduce(
      (acc, s) => ({
        taxableAmt: acc.taxableAmt + s.taxableAmt,
        cgst:       acc.cgst       + s.cgst,
        sgst:       acc.sgst       + s.sgst,
        totalTax:   acc.totalTax   + s.totalTax,
      }),
      { taxableAmt: 0, cgst: 0, sgst: 0, totalTax: 0 }
    );

    res.json({ success: true, slabs, totals, from: start, to: end });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};