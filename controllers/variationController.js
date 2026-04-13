const Variation = require("../models/Variation");

exports.getAllVariations = async (req, res) => {
  try {
    const variations = await Variation.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, variations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createVariation = async (req, res) => {
  try {
    const { name, values } = req.body;
    const variation = new Variation({ name, values, shopId: req.user.shopId });
    await variation.save();
    res.status(201).json({ success: true, variation });
  } catch (error) {
    res.status(400).json({ success: false, message: "Variation already exists" });
  }
};

exports.deleteVariation = async (req, res) => {
  try {
    const variation = await Variation.findOneAndDelete({ _id: req.params.id, shopId: req.user.shopId });
    if (!variation) return res.status(404).json({ message: "Variation not found" });
    res.status(200).json({ success: true, message: "Variation deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};