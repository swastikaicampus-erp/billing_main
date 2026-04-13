const Category = require("../models/Category");


// ================= GET ALL =================

exports.getAllCategories = async (req, res) => {

  try {

    const categories = await Category.find({
      userId: req.user.id
    })
    .populate("parentCategory", "name")
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      categories
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};



// ================= CREATE =================

exports.createCategory = async (req, res) => {

  try {

    const { name, slug, parentCategory } = req.body;

    let logo = "";

    if (req.file) {
      logo = `/uploads/${req.file.filename}`;
    }

    const category = new Category({

      name,
      slug,
      logo,

      parentCategory: parentCategory || null,

      userId: req.user.id

    });

    await category.save();

    res.status(201).json({
      success: true,
      category
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: "Slug must be unique for your account"
    });

  }

};



// ================= UPDATE =================

exports.updateCategory = async (req, res) => {

  try {

    const { name, slug, parentCategory } = req.body;

    let updateData = {
      name,
      slug,
      parentCategory: parentCategory || null
    };

    if (req.file) {
      updateData.logo = `/uploads/${req.file.filename}`;
    }

    const category = await Category.findOneAndUpdate(

      { _id: req.params.id, userId: req.user.id },

      updateData,

      { new: true }

    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      category
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message
    });

  }

};



// ================= DELETE =================

exports.deleteCategory = async (req, res) => {

  try {

    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message
    });

  }

};