const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true
  },
  name:    { type: String, required: true },
  email:   String,
  phone:   String,
  address: String,
}, { timestamps: true });

module.exports = mongoose.model("Warehouse", warehouseSchema);