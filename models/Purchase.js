// models/Purchase.js
const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema({
  product:       { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity:      { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  tax:           { type: mongoose.Schema.Types.ObjectId, ref: "Tax" },
  taxAmount:     { type: Number, default: 0 },
  totalPrice:    { type: Number, required: true },
});

const purchaseSchema = new mongoose.Schema({
  shopId:         { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  supplier:       { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  purchaseNumber: { type: String, required: true },  // AUTO-GEN
  purchaseDate:   { type: Date, default: Date.now },
  items:          [purchaseItemSchema],

  subtotal:       { type: Number, default: 0 },
  taxTotal:       { type: Number, default: 0 },
  discount:       { type: Number, default: 0 },
  grandTotal:     { type: Number, required: true },

  paymentMode:    { type: String, enum: ["Cash", "UPI", "Card", "Credit"], default: "Cash" },
  paymentStatus:  { type: String, enum: ["Paid", "Partial", "Unpaid"], default: "Paid" },
  paidAmount:     { type: Number, default: 0 },
  dueAmount:      { type: Number, default: 0 },

  notes:          { type: String, default: "" },
  status:         { type: String, enum: ["Received", "Pending", "Cancelled"], default: "Received" },
}, { timestamps: true });

// Shop-wise unique purchase number
purchaseSchema.index({ purchaseNumber: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model("Purchase", purchaseSchema);