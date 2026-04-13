// controllers/purchaseController.js
const Purchase = require("../models/Purchase");
const Product  = require("../models/Product");
const Counter  = require("../models/Counter"); // Purchase number ke liye

// ✅ Auto Purchase Number generate karo
async function generatePurchaseNumber(shopId) {
  const counter = await Counter.findOneAndUpdate(
    { shopId, type: "purchase" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `PUR-${String(counter.seq).padStart(5, "0")}`; // PUR-00001
}

// ✅ CREATE PURCHASE — Stock bhi badhega
exports.createPurchase = async (req, res) => {
  try {
    const { supplier, items, discount, paymentMode, paymentStatus, paidAmount, notes, purchaseDate } = req.body;

    let subtotal  = 0;
    let taxTotal  = 0;

    // Items validate + calculate
    const processedItems = items.map((item) => {
      const itemTotal = item.quantity * item.purchasePrice;
      const tax       = item.taxAmount || 0;
      subtotal  += itemTotal;
      taxTotal  += tax;
      return {
        product:       item.product,
        quantity:      item.quantity,
        purchasePrice: item.purchasePrice,
        tax:           item.tax || null,
        taxAmount:     tax,
        totalPrice:    itemTotal + tax,
      };
    });

    const grandTotal = subtotal + taxTotal - (discount || 0);
    const dueAmount  = grandTotal - (paidAmount || grandTotal);

    const purchaseNumber = await generatePurchaseNumber(req.user.shopId);

    const purchase = await Purchase.create({
      shopId: req.user.shopId,
      supplier,
      purchaseNumber,
      purchaseDate: purchaseDate || Date.now(),
      items: processedItems,
      subtotal,
      taxTotal,
      discount:      discount || 0,
      grandTotal,
      paymentMode,
      paymentStatus: paymentStatus || "Paid",
      paidAmount:    paidAmount || grandTotal,
      dueAmount:     dueAmount < 0 ? 0 : dueAmount,
      notes,
      status: "Received",
    });

    // ✅ Stock update — har product ka openingStock badhao
    for (const item of items) {
      await Product.findOneAndUpdate(
        { _id: item.product, shopId: req.user.shopId },
        { $inc: { openingStock: item.quantity } }
      );
    }

    res.status(201).json({ success: true, message: "Purchase saved", purchase });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Purchase number duplicate" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ GET ALL
exports.getPurchases = async (req, res) => {
  try {
    const { from, to, supplier, status } = req.query;
    const filter = { shopId: req.user.shopId };

    if (from && to) {
      filter.purchaseDate = { $gte: new Date(from), $lte: new Date(to) };
    }
    if (supplier) filter.supplier = supplier;
    if (status)   filter.status   = status;

    const purchases = await Purchase.find(filter)
      .populate("supplier", "name phone")
      .populate("items.product", "name itemCode")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: purchases.length, purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ GET SINGLE
exports.getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, shopId: req.user.shopId })
      .populate("supplier")
      .populate("items.product items.tax");

    if (!purchase) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ CANCEL PURCHASE — Stock wapas ghatao
exports.cancelPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, shopId: req.user.shopId });

    if (!purchase) return res.status(404).json({ success: false, message: "Not found" });
    if (purchase.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Already cancelled" });
    }

    // ✅ Stock wapas ghatao
    for (const item of purchase.items) {
      await Product.findOneAndUpdate(
        { _id: item.product, shopId: req.user.shopId },
        { $inc: { openingStock: -item.quantity } }
      );
    }

    purchase.status = "Cancelled";
    await purchase.save();

    res.json({ success: true, message: "Purchase cancelled, stock reversed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};