const mongoose = require("mongoose");

const variationSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  values: [{ type: String }],
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true
  }
}, { timestamps: true });

variationSchema.index({ name: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model("Variation", variationSchema);