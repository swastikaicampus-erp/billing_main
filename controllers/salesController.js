const Sale    = require("../models/Sale");
const Product = require("../models/Product");
const Counter = require("../models/Counter"); // invoice number ke liye

// ─── Helper: Invoice Number Generate ──────────────────────────────
// models/Counter.js bhi banana hoga (neeche diya hai)
async function generateInvoiceNumber(shopId) {
  const counter = await Counter.findOneAndUpdate(
    { shopId, type: "invoiceNumber" },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const num = String(counter.seq).padStart(5, "0");
  return `INV-${num}`;
}

// ─── CREATE SALE ───────────────────────────────────────────────────
exports.createSale = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customer,
      items,             // array of { productId, quantity, discount }
      discountType,
      discountValue,
      paymentMode,
      amountPaid,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Koi item nahi hai bill mein" });
    }

    // ─── Stock check + item rows build ───
    let subtotal     = 0;
    let totalTax     = 0;
    const saleItems  = [];

    for (const item of items) {
      const product = await Product.findOne({
        _id:    item.productId,
        shopId: req.user.shopId,
        isActive: true,
      }).populate("unit tax");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }

      if (product.openingStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for: ${product.name} (available: ${product.openingStock})`,
        });
      }

      const qty         = Number(item.quantity);
      const price       = product.sellingPrice;
      const itemDisc    = Number(item.discount || 0);           // per-item discount %
      const taxPercent  = product.tax?.percent || 0;

      const priceAfterDiscount = price * (1 - itemDisc / 100);
      const taxAmount          = (priceAfterDiscount * taxPercent) / 100;
      const itemSubtotal       = (priceAfterDiscount + taxAmount) * qty;

      subtotal  += priceAfterDiscount * qty;
      totalTax  += taxAmount * qty;

      saleItems.push({
        product:      product._id,
        productName:  product.name,
        itemCode:     product.itemCode || "",
        quantity:     qty,
        unit:         product.unit?.name || "",
        purchasePrice:product.purchasePrice,
        sellingPrice: price,
        mrp:          product.mrp,
        discount:     itemDisc,
        taxPercent,
        taxAmount:    taxAmount * qty,
        subtotal:     itemSubtotal,
      });
    }

    // ─── Bill-level discount ───
    let discountAmount = 0;
    if (discountType === "percent") {
      discountAmount = (subtotal * Number(discountValue || 0)) / 100;
    } else {
      discountAmount = Number(discountValue || 0);
    }

    const grandTotal   = subtotal + totalTax - discountAmount;
    const paid         = Number(amountPaid || grandTotal);
    const changeAmount = Math.max(0, paid - grandTotal);
    const dueAmount    = Math.max(0, grandTotal - paid);

    const status = dueAmount > 0
      ? dueAmount === grandTotal ? "Unpaid" : "Partial"
      : "Paid";

    // ─── Invoice number ───
    const invoiceNumber = await generateInvoiceNumber(req.user.shopId);

    // ─── Save sale ───
    const sale = await Sale.create({
      shopId:        req.user.shopId,
      invoiceNumber,
      customer:      customer || null,
      customerName:  customerName || "Walk-in Customer",
      customerPhone: customerPhone || "",
      items:         saleItems,
      subtotal,
      discountType:  discountType || "flat",
      discountValue: Number(discountValue || 0),
      discountAmount,
      taxAmount:     totalTax,
      grandTotal,
      paymentMode:   paymentMode || "Cash",
      amountPaid:    paid,
      changeAmount,
      dueAmount,
      status,
      notes:         notes || "",
      createdBy:     req.user.id,
    });

    // ─── Stock deduct ───
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { openingStock: -Number(item.quantity) },
      });
    }

    res.status(201).json({ success: true, message: "Sale created", sale });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Invoice number conflict, retry karo" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL SALES ─────────────────────────────────────────────────
exports.getSales = async (req, res) => {
  try {
    const { from, to, status, paymentMode, search, page = 1, limit = 20 } = req.query;

    const filter = { shopId: req.user.shopId };

    if (status)      filter.status      = status;
    if (paymentMode) filter.paymentMode = paymentMode;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59));
    }

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerName:  { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Sale.countDocuments(filter);

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select("-items"); // list mein items mat bhejo, heavy hoga

    res.json({
      success: true,
      total,
      page:    Number(page),
      pages:   Math.ceil(total / Number(limit)),
      sales,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET SINGLE SALE ───────────────────────────────────────────────
exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id:    req.params.id,
      shopId: req.user.shopId,
    }).populate("customer", "name phone address");

    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    res.json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CANCEL SALE ───────────────────────────────────────────────────
exports.cancelSale = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id:    req.params.id,
      shopId: req.user.shopId,
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    if (sale.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Already cancelled hai" });
    }

    sale.status = "Cancelled";
    await sale.save();

    // ─── Stock wapas ───
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { openingStock: item.quantity },
      });
    }

    res.json({ success: true, message: "Sale cancelled, stock restored" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ─── GET TODAY'S SUMMARY ──────────────────────────────────────────
exports.getTodaySummary = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await Sale.find({
      shopId: req.user.shopId,
      status: { $ne: "Cancelled" },
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + s.grandTotal, 0),
      totalReceived: sales.reduce((sum, s) => sum + s.amountPaid, 0),
      totalDue: sales.reduce((sum, s) => sum + s.dueAmount, 0),
    };

    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};