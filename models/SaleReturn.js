const mongoose = require("mongoose");
 
const saleReturnItemSchema = new mongoose.Schema({
  product:     { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  quantity:    { type: Number, required: true },
  sellingPrice:{ type: Number, required: true },
  taxPercent:  { type: Number, default: 0 },
  taxAmount:   { type: Number, default: 0 },
  subtotal:    { type: Number, required: true },
});
 
const saleReturnSchema = new mongoose.Schema({
  shopId:       { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  sale:         { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
  returnNumber: { type: String, required: true },
  returnDate:   { type: Date, default: Date.now },
  customer:     { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  customerName: { type: String, default: "" },
  items:        [saleReturnItemSchema],
  totalAmount:  { type: Number, required: true },
  refundMode:   { type: String, enum: ["Cash", "UPI", "Card", "Adjust"], default: "Cash" },
  reason:       { type: String, default: "" },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
 
saleReturnSchema.index({ returnNumber: 1, shopId: 1 }, { unique: true });
module.exports = mongoose.model("SaleReturn", saleReturnSchema);