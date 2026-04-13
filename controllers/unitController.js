const Unit = require("../models/Unit");

exports.getUnits = async (req, res) => {
  try {
    const units = await Unit.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json({ success: true, units });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUnit = async (req, res) => {
  try {
    const { name, shortName } = req.body;
    const unit = new Unit({ name, shortName, shopId: req.user.shopId });
    await unit.save();
    res.status(201).json({ success: true, unit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findOneAndDelete({ _id: req.params.id, shopId: req.user.shopId });
    if (!unit) return res.status(404).json({ message: "Unit not found" });
    res.json({ success: true, message: "Unit deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};