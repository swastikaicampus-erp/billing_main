const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  shortName: { type: String, required: true },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true
  }
}, { timestamps: true });

unitSchema.index({ name: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model("Unit", unitSchema);