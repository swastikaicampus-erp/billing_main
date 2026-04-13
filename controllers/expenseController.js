// ═══════════════════════════════════════════════════════════════
// controllers/expenseController.js
// ═══════════════════════════════════════════════════════════════
const Expense = require("../models/Expense");

const DEFAULT_CATEGORIES = ["Rent","Salary","Electricity","Internet","Transport","Maintenance","Marketing","Misc"];

exports.getCategories = async (req, res) => {
  res.json({ success: true, categories: DEFAULT_CATEGORIES });
};

exports.createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      shopId:    req.user.shopId,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, message: "Expense add ho gayi", expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const { from, to, category, page = 1, limit = 20 } = req.query;
    const filter = { shopId: req.user.shopId };
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(new Date(to).setHours(23,59,59));
    }
    const skip  = (Number(page)-1)*Number(limit);
    const total = await Expense.countDocuments(filter);
    const data  = await Expense.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit));

    // Total
    const totalAgg = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({ success: true, total, totalAmount: totalAgg[0]?.total || 0, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.shopId },
      req.body, { new: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, shopId: req.user.shopId });
    if (!expense) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Expense delete ho gayi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};