
// ═══════════════════════════════════════════════════════════════
// controllers/purchaseReturnController.js
// ═══════════════════════════════════════════════════════════════
const PurchaseReturn = require("../models/PurchaseReturn");
const Purchase       = require("../models/Purchase");

exports.createPurchaseReturn = async (req, res) => {
  try {
    const { purchaseId, items, refundMode, reason } = req.body;

    const purchase = await Purchase.findOne({ _id: purchaseId, shopId: req.user.shopId })
      .populate("items.product", "name");
    if (!purchase) return res.status(404).json({ success: false, message: "Purchase not found" });
    if (purchase.status === "Cancelled") return res.status(400).json({ success: false, message: "Cancelled purchase return nahi ho sakti" });

    let totalAmount = 0;
    const returnItems = [];

    for (const ri of items) {
      const pItem = purchase.items.find(i => i.product._id.toString() === ri.productId);
      if (!pItem) return res.status(400).json({ success: false, message: `Product purchase mein nahi tha` });
      if (ri.quantity > pItem.quantity) return res.status(400).json({ success: false, message: `Return qty zyada hai` });

      const totalPrice = ri.quantity * pItem.purchasePrice;
      totalAmount += totalPrice;

      returnItems.push({
        product:       pItem.product._id,
        productName:   pItem.product.name,
        quantity:      ri.quantity,
        purchasePrice: pItem.purchasePrice,
        taxAmount:     0,
        totalPrice,
      });
    }

    const returnNumber = await genReturnNumber(req.user.shopId, "purchase-return");

    const pr = await PurchaseReturn.create({
      shopId:      req.user.shopId,
      purchase:    purchaseId,
      returnNumber,
      supplier:    purchase.supplier,
      items:       returnItems,
      totalAmount,
      refundMode,
      reason:      reason || "",
      createdBy:   req.user.id,
    });

    // ✅ Stock ghatao (wapas supplier ke paas gayi)
    for (const ri of items) {
      await Product.findByIdAndUpdate(ri.productId, {
        $inc: { openingStock: -ri.quantity },
      });
    }

    res.status(201).json({ success: true, message: "Purchase return ho gayi", pr });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPurchaseReturns = async (req, res) => {
  try {
    const { from, to, page = 1, limit = 20 } = req.query;
    const filter = { shopId: req.user.shopId };
    if (from || to) {
      filter.returnDate = {};
      if (from) filter.returnDate.$gte = new Date(from);
      if (to)   filter.returnDate.$lte = new Date(new Date(to).setHours(23,59,59));
    }
    const skip  = (Number(page)-1)*Number(limit);
    const total = await PurchaseReturn.countDocuments(filter);
    const data  = await PurchaseReturn.find(filter)
      .populate("purchase", "purchaseNumber")
      .populate("supplier", "name")
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    res.json({ success: true, total, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPurchaseReturn = async (req, res) => {
  try {
    const data = await PurchaseReturn.findOne({ _id: req.params.id, shopId: req.user.shopId })
      .populate("purchase", "purchaseNumber grandTotal")
      .populate("supplier", "name phone");
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};