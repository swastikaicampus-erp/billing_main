const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName:  { type: String, required: true },   // snapshot — product delete ho jaye toh bhi bill rahega
  itemCode:     { type: String, default: "" },
  quantity:     { type: Number, required: true },
  unit:         { type: String, default: "" },
  purchasePrice:{ type: Number, default: 0 },
  sellingPrice: { type: Number, required: true },
  mrp:          { type: Number, default: 0 },
  discount:     { type: Number, default: 0 },       // per item discount %
  taxPercent:   { type: Number, default: 0 },
  taxAmount:    { type: Number, default: 0 },
  subtotal:     { type: Number, required: true },   // after discount + tax
});

const saleSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    invoiceNumber: { type: String, required: true },

    // Customer (optional — walk-in allowed)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    customerName:  { type: String, default: "Walk-in Customer" },
    customerPhone: { type: String, default: "" },

    items: [saleItemSchema],

    // Totals
    subtotal:      { type: Number, required: true }, // before discount/tax
    discountType:  { type: String, enum: ["percent", "flat"], default: "flat" },
    discountValue: { type: Number, default: 0 },
    discountAmount:{ type: Number, default: 0 },
    taxAmount:     { type: Number, default: 0 },
    grandTotal:    { type: Number, required: true },

    // Payment
    paymentMode:   { type: String, enum: ["Cash", "UPI", "Card", "Credit"], default: "Cash" },
    amountPaid:    { type: Number, default: 0 },
    changeAmount:  { type: Number, default: 0 },   // cash wapas
    dueAmount:     { type: Number, default: 0 },   // udhaar

    status: {
      type: String,
      enum: ["Paid", "Partial", "Unpaid", "Cancelled"],
      default: "Paid",
    },

    notes:     { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// ✅ Ek shop mein invoice number unique
saleSchema.index({ invoiceNumber: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model("Sale", saleSchema);