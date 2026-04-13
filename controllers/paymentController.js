// ═══════════════════════════════════════════════════════════════
// controllers/paymentController.js
// ═══════════════════════════════════════════════════════════════
const Payment  = require("../models/Payment");
const Supplier = require("../models/Supplier");

// POST /api/payments/add
exports.createPayment = async (req, res) => {
  try {
    const { type, partyType, partyId, amount, paymentMode, date, reference, notes } = req.body;

    // Validate party
    let party, partyName;
    if (partyType === "Customer") {
      party = await Customer.findOne({ _id: partyId, shopId: req.user.shopId });
      if (!party) return res.status(404).json({ success: false, message: "Customer not found" });
      partyName = party.name;

      // Update customer ledger
      if (type === "PaymentIn") {
        const pay = Math.min(Number(amount), party.totalDue);
        party.totalDue  = Math.max(0, party.totalDue - pay);
        party.totalPaid += pay;
        await party.save();
      }
    } else {
      party = await Supplier.findOne({ _id: partyId, shopId: req.user.shopId });
      if (!party) return res.status(404).json({ success: false, message: "Supplier not found" });
      partyName = party.name;
    }

    const payment = await Payment.create({
      shopId:      req.user.shopId,
      type,
      partyType,
      party:       partyId,
      partyName,
      amount:      Number(amount),
      paymentMode,
      date:        date || Date.now(),
      reference:   reference || "",
      notes:       notes || "",
      createdBy:   req.user.id,
    });

    res.status(201).json({ success: true, message: "Payment record ho gayi", payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/payments/all
exports.getPayments = async (req, res) => {
  try {
    const { type, partyType, partyId, from, to, page = 1, limit = 20 } = req.query;
    const filter = { shopId: req.user.shopId };
    if (type)      filter.type      = type;
    if (partyType) filter.partyType = partyType;
    if (partyId)   filter.party     = partyId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(new Date(to).setHours(23,59,59));
    }
    const skip  = (Number(page)-1)*Number(limit);
    const total = await Payment.countDocuments(filter);
    const data  = await Payment.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit));
    res.json({ success: true, total, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/payments/ledger/:partyType/:partyId
exports.getLedger = async (req, res) => {
  try {
    const { partyType, partyId } = req.params;
    const payments = await Payment.find({
      shopId:    req.user.shopId,
      partyType,
      party:     partyId,
    }).sort({ date: 1 });

    // Build running balance
    let balance = 0;
    const ledger = payments.map(p => {
      if (p.type === "PaymentIn")  balance -= p.amount;
      if (p.type === "PaymentOut") balance += p.amount;
      return { ...p.toObject(), balance };
    });

    res.json({ success: true, ledger });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};