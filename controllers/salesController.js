const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Customer = require("../models/Customer");

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



exports.createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const shopId = req.user.shopId;
    const {
      customerName, customerPhone,
      items, discountType, discountValue,
      paymentMode, amountPaid, notes,
    } = req.body;

    // ── 1. Customer resolve karo ──────────────────────────────────
    let customerId = null;

    if (customerPhone) {
      // Phone se dhundho
      let customer = await Customer.findOne({ shopId, phone: customerPhone }).session(session);

      if (!customer) {
        // Naya customer banao
        customer = await Customer.create([{
          shopId,
          name: customerName || "Walk-in Customer",
          phone: customerPhone,
        }], { session });
        customer = customer[0];
      } else if (customerName && customer.name !== customerName) {
        // Name update karo agar alag hai
        customer.name = customerName;
        await customer.save({ session });
      }

      customerId = customer._id;
    }

    // ── 2. Items validate & calculate karo ───────────────────────
    let subtotal = 0;
    let totalTax = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, shopId }).session(session);
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      if (product.openingStock < item.quantity) {
        throw new Error(`Insufficient stock for: ${product.name}`);
      }

      const priceAfterDisc = product.sellingPrice * (1 - (item.discount || 0) / 100);
      const taxAmt = (priceAfterDisc * (product.tax?.percent || 0)) / 100;
      const lineTotal = (priceAfterDisc + taxAmt) * item.quantity;

      subtotal += priceAfterDisc * item.quantity;
      totalTax += taxAmt * item.quantity;

      saleItems.push({
        product: product._id,
        productName: product.name,
        itemCode: product.itemCode,
        quantity: item.quantity,
        sellingPrice: product.sellingPrice,
        discount: item.discount || 0,
        taxPercent: product.tax?.percent || 0,
        subtotal: lineTotal,
        unit: product.unit?.name || "",
      });

      // Stock ghatao
      product.openingStock -= item.quantity;
      await product.save({ session });
    }

    // ── 3. Bill discount & totals ─────────────────────────────────
    const discountAmount =
      discountType === "percent"
        ? (subtotal * (discountValue || 0)) / 100
        : (discountValue || 0);

    const grandTotal = Math.max(0, subtotal + totalTax - discountAmount);
    const paid = Number(amountPaid) || grandTotal;
    const dueAmount = Math.max(0, grandTotal - paid);

    // ── 4. Invoice number generate karo ──────────────────────────
    const count = await Sale.countDocuments({ shopId }).session(session);
    const invoiceNo = `INV-${String(count + 1).padStart(5, "0")}`;

    // ── 5. Sale save karo ─────────────────────────────────────────
    const [sale] = await Sale.create([{
      shopId,
      invoiceNo,
      customer: customerId,
      customerName: customerName || "Walk-in Customer",
      customerPhone,
      items: saleItems,
      subtotal,
      totalTax,
      discountType,
      discountValue: discountValue || 0,
      discountAmount,
      grandTotal,
      paymentMode,
      amountPaid: paid,
      dueAmount,
      notes,
      status: "Completed",
    }], { session });

    // ── 6. Customer ka due update karo ────────────────────────────
    if (customerId && dueAmount > 0) {
      await Customer.findByIdAndUpdate(
        customerId,
        {
          $inc: {
            totalDue: dueAmount,
            totalPaid: paid,
          },
        },
        { session }
      );
    } else if (customerId && paid > 0) {
      await Customer.findByIdAndUpdate(
        customerId,
        { $inc: { totalPaid: paid } },
        { session }
      );
    }

    await session.commitTransaction();
    res.status(201).json({ success: true, sale });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// ─── GET ALL SALES ─────────────────────────────────────────────────
exports.getSales = async (req, res) => {
  try {
    const { from, to, status, paymentMode, search, page = 1, limit = 20 } = req.query;

    const filter = { shopId: req.user.shopId };

    if (status) filter.status = status;
    if (paymentMode) filter.paymentMode = paymentMode;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59));
    }

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Sale.countDocuments(filter);

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select("-items"); // list mein items mat bhejo, heavy hoga

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
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
      _id: req.params.id,
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
      _id: req.params.id,
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