const mongoose = require("mongoose");

const adjustmentSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    adjustmentType: {
      type: String,
      enum: ["Add", "Subtract"],
      required: true,
    },
    quantity:    { type: Number, required: true },
    notes:       { type: String, default: "" },
    source:      { type: String, enum: ["Manual", "POS"], default: "Manual" },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Adjustment", adjustmentSchema);