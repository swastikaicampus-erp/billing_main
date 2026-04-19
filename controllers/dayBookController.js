const Sale     = require("../models/Sale");
const Purchase = require("../models/Purchase");
const Expense  = require("../models/Expense");

// ── Optional models ──
let Payment, SaleReturn, PurchaseReturn;
try { Payment        = require("../models/Payment");        } catch (_) { Payment        = null; }
try { SaleReturn     = require("../models/SaleReturn");     } catch (_) { SaleReturn     = null; }
try { PurchaseReturn = require("../models/PurchaseReturn"); } catch (_) { PurchaseReturn = null; }

// ─────────────────────────────────────────────────────────────────────
// GET /api/reports/day-book?date=YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────
exports.getDayBook = async (req, res) => {
  try {
    const shopId = req.user.shopId;

    const date  = req.query.date ? new Date(req.query.date) : new Date();
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);
    const dFilter = { $gte: start, $lte: end };

    // ── Parallel fetch ──
    const [
      sales,
      purchases,
      expenses,
      payments,
      saleReturns,
      purchaseReturns,
    ] = await Promise.all([
      // Sales
      Sale.find({ shopId, createdAt: dFilter, status: { $ne: "Cancelled" } })
        .select("invoiceNo customerName grandTotal amountPaid dueAmount paymentMode createdAt")
        .sort({ createdAt: -1 })
        .lean(),

      // Purchases
      Purchase.find({ shopId, purchaseDate: dFilter, status: { $ne: "Cancelled" } })
        .populate("supplier", "name phone")
        .select("purchaseNumber supplier grandTotal paidAmount dueAmount paymentMode purchaseDate")
        .sort({ purchaseDate: -1 })
        .lean(),

      // Expenses
      Expense.find({ shopId, date: dFilter })
        .select("category amount paymentMode description date")
        .sort({ date: -1 })
        .lean(),

      // Payments (optional)
      Payment
        ? Payment.find({ shopId, date: dFilter })
            .select("type partyType partyName amount paymentMode reference date")
            .sort({ date: -1 })
            .lean()
        : Promise.resolve([]),

      // Sale returns (optional)
      SaleReturn
        ? SaleReturn.find({ shopId, returnDate: dFilter })
            .select("returnNumber customerName totalAmount refundMode returnDate")
            .sort({ returnDate: -1 })
            .lean()
        : Promise.resolve([]),

      // Purchase returns (optional)
      PurchaseReturn
        ? PurchaseReturn.find({ shopId, returnDate: dFilter })
            .select("returnNumber totalAmount refundMode returnDate")
            .sort({ returnDate: -1 })
            .lean()
        : Promise.resolve([]),
    ]);

    // ── Cash flow calculation ──
    const cashIn =
      sales
        .filter((s) => s.paymentMode === "Cash")
        .reduce((a, s) => a + (s.amountPaid || 0), 0) +
      payments
        .filter((p) => p.type === "PaymentIn" && p.paymentMode === "Cash")
        .reduce((a, p) => a + (p.amount || 0), 0);

    const cashOut =
      purchases
        .filter((p) => p.paymentMode === "Cash")
        .reduce((a, p) => a + (p.paidAmount || 0), 0) +
      expenses
        .filter((e) => e.paymentMode === "Cash")
        .reduce((a, e) => a + (e.amount || 0), 0) +
      payments
        .filter((p) => p.type === "PaymentOut" && p.paymentMode === "Cash")
        .reduce((a, p) => a + (p.amount || 0), 0);

    // ── UPI / Card flows ──
    const upiIn =
      sales
        .filter((s) => s.paymentMode === "UPI")
        .reduce((a, s) => a + (s.amountPaid || 0), 0);

    const cardIn =
      sales
        .filter((s) => s.paymentMode === "Card")
        .reduce((a, s) => a + (s.amountPaid || 0), 0);

    res.json({
      success: true,
      date: start,
      summary: {
        totalSales:       sales.reduce((a, s) => a + (s.grandTotal || 0), 0),
        totalBills:       sales.length,
        totalPurchases:   purchases.reduce((a, p) => a + (p.grandTotal || 0), 0),
        totalExpenses:    expenses.reduce((a, e) => a + (e.amount || 0), 0),
        totalPaymentsIn:  payments.filter((p) => p.type === "PaymentIn").reduce((a, p) => a + (p.amount || 0), 0),
        totalPaymentsOut: payments.filter((p) => p.type === "PaymentOut").reduce((a, p) => a + (p.amount || 0), 0),
        saleReturnsTotal: saleReturns.reduce((a, r) => a + (r.totalAmount || 0), 0),
        cashIn,
        cashOut,
        upiIn,
        cardIn,
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
    console.error("DayBook Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};