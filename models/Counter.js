const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  type:   { type: String, required: true },   // "invoice"
  seq:    { type: Number, default: 0 },
});

counterSchema.index({ shopId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Counter", counterSchema);