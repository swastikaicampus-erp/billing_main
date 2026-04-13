const mongoose = require("mongoose");

const taxSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  percent: { type: Number, required: true }, // 'rate' → 'percent' (frontend se match)
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Tax", taxSchema);