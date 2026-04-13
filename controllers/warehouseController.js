const Warehouse = require("../models/Warehouse");

exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json({ success: true, warehouses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    const warehouse = new Warehouse({ ...req.body, shopId: req.user.shopId });
    await warehouse.save();
    res.status(201).json({ success: true, warehouse });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.shopId },
      req.body,
      { new: true }
    );
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });
    res.json({ success: true, warehouse });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOneAndDelete({ _id: req.params.id, shopId: req.user.shopId });
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};