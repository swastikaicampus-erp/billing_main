const mongoose = require("mongoose");

const expenseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("ExpenseCategory", expenseCategorySchema);