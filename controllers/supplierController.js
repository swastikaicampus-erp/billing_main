// controllers/supplierController.js
const Supplier = require("../models/Supplier");

// ✅ CREATE
exports.createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create({
      ...req.body,
      shopId: req.user.shopId,
    });
    res.status(201).json({ success: true, message: "Supplier created", supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET ALL (search + filter)
exports.getSuppliers = async (req, res) => {
  try {
    const filter = { shopId: req.user.shopId };

    if (req.query.search) {
      const q = req.query.search;
      filter.$or = [
        { name:  { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { gstin: { $regex: q, $options: "i" } },
      ];
    }

    if (req.query.active) {
      filter.isActive = req.query.active === "true";
    }

    const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: suppliers.length, suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET SINGLE
exports.getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id:    req.params.id,
      shopId: req.user.shopId,
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    res.json({ success: true, supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ UPDATE
exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.shopId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    res.json({ success: true, message: "Supplier updated", supplier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ DELETE
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndDelete({
      _id:    req.params.id,
      shopId: req.user.shopId,
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    res.json({ success: true, message: "Supplier deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ TOGGLE ACTIVE / INACTIVE
exports.toggleActive = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id:    req.params.id,
      shopId: req.user.shopId,
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    supplier.isActive = !supplier.isActive;
    await supplier.save();

    res.json({
      success:  true,
      message:  `Supplier ${supplier.isActive ? "activated" : "deactivated"}`,
      isActive: supplier.isActive,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};