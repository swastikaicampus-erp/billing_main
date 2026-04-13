const ExpenseCategory = require("../models/ExpenseCategory");

exports.addCategory = async (req, res) => {
  try {
    const category = new ExpenseCategory({ ...req.body, userId: req.user.id });
    await category.save();
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await ExpenseCategory.find({ userId: req.user.id });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};