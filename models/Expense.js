const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  shopId:      { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  category:    { type: String, required: true }, // Rent, Salary, Electricity, etc.
  amount:      { type: Number, required: true },
  date:        { type: Date, default: Date.now },
  paymentMode: { type: String, enum: ["Cash", "UPI", "Card", "Bank Transfer"], default: "Cash" },
  description: { type: String, default: "" },
  reference:   { type: String, default: "" },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
 
module.exports = mongoose.model("Expense", expenseSchema);
 