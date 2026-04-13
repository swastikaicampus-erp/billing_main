const Tax = require("../models/Tax");

exports.getTaxes = async (req, res) => {
  try {
    const taxes = await Tax.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json({ success: true, taxes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTax = async (req, res) => {
  try {
    const tax = new Tax({ ...req.body, shopId: req.user.shopId });
    await tax.save();
    res.status(201).json({ success: true, tax });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteTax = async (req, res) => {
  try {
    const tax = await Tax.findOneAndDelete({ _id: req.params.id, shopId: req.user.shopId });
    if (!tax) return res.status(404).json({ message: "Tax not found" });
    res.json({ success: true, message: "Tax deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};