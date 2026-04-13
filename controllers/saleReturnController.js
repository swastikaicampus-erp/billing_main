// ═══════════════════════════════════════════════════════════════
// controllers/saleReturnController.js
// ═══════════════════════════════════════════════════════════════
const SaleReturn = require("../models/SaleReturn");
const Sale       = require("../models/Sale");
const Product    = require("../models/Product");
const Customer   = require("../models/Customer");
const Counter    = require("../models/Counter");

async function genReturnNumber(shopId, type) {
  const counter = await Counter.findOneAndUpdate(
    { shopId, type },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const prefix = type === "sale-return" ? "SR" : "PR";
  return `${prefix}-${String(counter.seq).padStart(5, "0")}`;
}

// POST /api/sale-returns/add
exports.createSaleReturn = async (req, res) => {
  try {
    const { saleId, items, refundMode, reason } = req.body;

    const sale = await Sale.findOne({ _id: saleId, shopId: req.user.shopId });
    if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });
    if (sale.status === "Cancelled") return res.status(400).json({ success: false, message: "Cancelled sale return nahi ho sakti" });

    // Build return items — validate against original sale items
    let totalAmount = 0;
    const returnItems = [];

    for (const ri of items) {
      const saleItem = sale.items.find(i => i.product.toString() === ri.productId);
      if (!saleItem) return res.status(400).json({ success: false, message: `Product bill mein nahi tha: ${ri.productId}` });
      if (ri.quantity > saleItem.quantity) return res.status(400).json({ success: false, message: `Return quantity zyada hai: ${saleItem.productName}` });

      const subtotal = ri.quantity * saleItem.sellingPrice;
      const taxAmount = (subtotal * saleItem.taxPercent) / 100;
      totalAmount += subtotal + taxAmount;

      returnItems.push({
        product:      saleItem.product,
        productName:  saleItem.productName,
        quantity:     ri.quantity,
        sellingPrice: saleItem.sellingPrice,
        taxPercent:   saleItem.taxPercent,
        taxAmount,
        subtotal:     subtotal + taxAmount,
      });
    }

    const returnNumber = await genReturnNumber(req.user.shopId, "sale-return");

    const saleReturn = await SaleReturn.create({
      shopId:       req.user.shopId,
      sale:         saleId,
      returnNumber,
      customer:     sale.customer,
      customerName: sale.customerName,
      items:        returnItems,
      totalAmount,
      refundMode,
      reason:       reason || "",
      createdBy:    req.user.id,
    });

    // ✅ Stock wapas badhao
    for (const ri of items) {
      await Product.findByIdAndUpdate(ri.productId, {
        $inc: { openingStock: ri.quantity },
      });
    }

    // ✅ Customer totalDue update karo agar Credit sale thi
    if (sale.customer && sale.dueAmount > 0) {
      const refundFromDue = Math.min(totalAmount, sale.dueAmount);
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: { totalDue: -refundFromDue },
      });
    }

    res.status(201).json({ success: true, message: "Sale return ho gayi", saleReturn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/sale-returns/all
exports.getSaleReturns = async (req, res) => {
  try {
    const { from, to, page = 1, limit = 20 } = req.query;
    const filter = { shopId: req.user.shopId };
    if (from || to) {
      filter.returnDate = {};
      if (from) filter.returnDate.$gte = new Date(from);
      if (to)   filter.returnDate.$lte = new Date(new Date(to).setHours(23,59,59));
    }
    const skip  = (Number(page)-1) * Number(limit);
    const total = await SaleReturn.countDocuments(filter);
    const data  = await SaleReturn.find(filter)
      .populate("sale", "invoiceNumber")
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    res.json({ success: true, total, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/sale-returns/:id
exports.getSaleReturn = async (req, res) => {
  try {
    const data = await SaleReturn.findOne({ _id: req.params.id, shopId: req.user.shopId })
      .populate("sale", "invoiceNumber customerName grandTotal");
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};