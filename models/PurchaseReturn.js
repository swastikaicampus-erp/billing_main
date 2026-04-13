
const mongoose = require("mongoose");

const purchaseReturnItemSchema = new mongoose.Schema({
  product:       { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName:   { type: String, required: true },
  quantity:      { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  taxAmount:     { type: Number, default: 0 },
  totalPrice:    { type: Number, required: true },
});
 
const purchaseReturnSchema = new mongoose.Schema({
  shopId:        { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  purchase:      { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", required: true },
  returnNumber:  { type: String, required: true },
  returnDate:    { type: Date, default: Date.now },
  supplier:      { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  items:         [purchaseReturnItemSchema],
  totalAmount:   { type: Number, required: true },
  refundMode:    { type: String, enum: ["Cash", "UPI", "Adjust", "Credit Note"], default: "Adjust" },
  reason:        { type: String, default: "" },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
 
purchaseReturnSchema.index({ returnNumber: 1, shopId: 1 }, { unique: true });
module.exports = mongoose.model("PurchaseReturn", purchaseReturnSchema);
 