
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