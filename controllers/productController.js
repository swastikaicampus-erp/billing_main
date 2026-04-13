const Product    = require("../models/Product");
const Adjustment = require("../models/Adjustment"); // ✅ Import tha hi nahi

// ✅ CREATE
exports.createProduct = async (req, res) => {
  try {
    const data = {
      ...req.body,
      shopId: req.user.shopId, // ✅ userId nahi, shopId
    };

    if (req.file) {
      data.image = "/uploads/" + req.file.filename;
    }

    const product = new Product(data);
    await product.save();

    res.status(201).json({ success: true, message: "Product created", product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Slug already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ GET ALL
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ shopId: req.user.shopId }) // ✅ shopId
      .populate("category brand unit tax")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ GET SINGLE
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id:    req.params.id,
      shopId: req.user.shopId, // ✅ shopId
    }).populate("category brand unit tax");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ UPDATE
exports.updateProduct = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = "/uploads/" + req.file.filename;
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.shopId }, // ✅ shopId
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product updated", product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Slug already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ DELETE
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id:    req.params.id,
      shopId: req.user.shopId, // ✅ shopId
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ STOCK ADJUST — Adjustment record bhi save hoga
exports.adjustStock = async (req, res) => {
  try {
    const { productId, quantity, adjustmentType, notes } = req.body;

    const product = await Product.findOne({
      _id:    productId,
      shopId: req.user.shopId,
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const amount = adjustmentType === "Add" ? Number(quantity) : -Number(quantity);

    if (product.openingStock + amount < 0) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    product.openingStock += amount;
    await product.save();

    // ✅ Adjustment record save karo
    await Adjustment.create({
      shopId:         req.user.shopId,
      product:        productId,
      adjustmentType,
      quantity:       Number(quantity),
      notes:          notes || "",
      source:         "Manual",
      createdBy:      req.user.id,
    });

    res.json({
      success: true,
      message: `Stock ${adjustmentType === "Add" ? "badha" : "ghata"} diya`,
      currentStock: product.openingStock,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ GET ALL ADJUSTMENTS
exports.getAdjustments = async (req, res) => {
  try {
    const list = await Adjustment.find({ shopId: req.user.shopId }) // ✅ shopId
      .populate("product", "name image itemCode openingStock")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ STOCK ALERTS — Fixed query
exports.getStockAlerts = async (req, res) => {
  try {
    const alerts = await Product.find({
      shopId: req.user.shopId,
      $expr: { $lte: ["$openingStock", "$quantityAlert"] }, // ✅ Fixed!
    })
      .select("name openingStock quantityAlert image")
      .sort({ openingStock: 1 })
      .limit(10);

    res.json({ success: true, count: alerts.length, alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};