const mongoose = require("mongoose");
const paymentSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  type: { type: String, enum: ["PaymentIn", "PaymentOut"], required: true },
  // PaymentIn  = customer ne paisa diya (udhaar chukaya)
  // PaymentOut = supplier ko paisa diya

  partyType: { type: String, enum: ["Customer", "Supplier"], required: true },
  party: { type: mongoose.Schema.Types.ObjectId, refPath: "partyType", required: true },
  partyName: { type: String, required: true },  // snapshot

  amount: { type: Number, required: true },
  paymentMode: { type: String, enum: ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"], default: "Cash" },
  date: { type: Date, default: Date.now },
  reference: { type: String, default: "" },  // cheque no, UTR no etc
  notes: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
