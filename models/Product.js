const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // ✅ shopId — userId nahi
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true },
    description: { type: String, default: "" },
    image:       { type: String, default: "" },
    itemCode:    { type: String, default: "" },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    brand:    { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    unit:     { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    tax:      { type: mongoose.Schema.Types.ObjectId, ref: "Tax" },

    purchasePrice: { type: Number, default: 0 },
    sellingPrice:  { type: Number, default: 0 },
    mrp:           { type: Number, default: 0 },

    openingStock:  { type: Number, default: 0 },
    quantityAlert: { type: Number, default: 5 },

    barcodeSymbology: { type: String, default: "CODE128" },
    expiryDate:       { type: Date },
    isActive:         { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ Ek shop mein same slug dobara nahi
productSchema.index({ slug: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model("Product", productSchema);