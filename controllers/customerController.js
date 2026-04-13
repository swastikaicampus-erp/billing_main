const Customer = require("../models/Customer");
const Sale     = require("../models/Sale");

// ─── CREATE ───────────────────────────────────────────────────────
exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      shopId: req.user.shopId,
    });
    res.status(201).json({ success: true, message: "Customer added", customer });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Yeh phone number pehle se exist karta hai" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL ──────────────────────────────────────────────────────
exports.getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, due } = req.query;

    const filter = { shopId: req.user.shopId, isActive: true };

    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { city:  { $regex: search, $options: "i" } },
      ];
    }

    // Sirf udhaar wale customers
    if (due === "true") filter.totalDue = { $gt: 0 };

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Customer.countDocuments(filter);

    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ success: true, total, customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET SINGLE ───────────────────────────────────────────────────
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id:    req.params.id,
      shopId: req.user.shopId,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.shopId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.json({ success: true, message: "Customer updated", customer });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Phone number already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE (soft) ────────────────────────────────────────────────
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.shopId },
      { isActive: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.json({ success: true, message: "Customer deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PURCHASE HISTORY ─────────────────────────────────────────────
exports.getCustomerHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {
      shopId:   req.user.shopId,
      customer: req.params.id,
      status:   { $ne: "Cancelled" },
    };

    const total = await Sale.countDocuments(filter);

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select("invoiceNumber grandTotal paymentMode status dueAmount createdAt");

    // Summary
    const allSales     = await Sale.find(filter).select("grandTotal amountPaid dueAmount");
    const totalSpent   = allSales.reduce((s, x) => s + x.grandTotal,   0);
    const totalPaid    = allSales.reduce((s, x) => s + x.amountPaid,   0);
    const totalDue     = allSales.reduce((s, x) => s + x.dueAmount,    0);

    res.json({
      success: true,
      total,
      summary: { totalSpent, totalPaid, totalDue, totalOrders: total },
      sales,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── RECORD PAYMENT (udhaar chukana) ─────────────────────────────
exports.recordPayment = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount daalo" });
    }

    const customer = await Customer.findOne({
      _id:    req.params.id,
      shopId: req.user.shopId,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const pay = Math.min(Number(amount), customer.totalDue);

    customer.totalDue  = Math.max(0, customer.totalDue - pay);
    customer.totalPaid += pay;
    await customer.save();

    res.json({
      success: true,
      message: `₹${pay} payment record ho gaya`,
      totalDue:  customer.totalDue,
      totalPaid: customer.totalPaid,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SUMMARY (top customers, total due) ──────────────────────────
exports.getCustomerSummary = async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments({
      shopId: req.user.shopId, isActive: true,
    });

    const udharCustomers = await Customer.countDocuments({
      shopId: req.user.shopId, isActive: true, totalDue: { $gt: 0 },
    });

    const totalDueAgg = await Customer.aggregate([
      { $match: { shopId: req.user.shopId, isActive: true } },
      { $group: { _id: null, total: { $sum: "$totalDue" } } },
    ]);

    const topCustomers = await Customer.find({
      shopId: req.user.shopId, isActive: true,
    })
      .sort({ totalPaid: -1 })
      .limit(5)
      .select("name phone totalPaid totalDue");

    res.json({
      success: true,
      summary: {
        totalCustomers,
        udharCustomers,
        totalDue: totalDueAgg[0]?.total || 0,
      },
      topCustomers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};