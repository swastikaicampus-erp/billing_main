const Brand = require("../models/Brand");

// GET ALL
exports.getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      brands,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// CREATE BRAND
exports.createBrand = async (req, res) => {
  try {

    const { name, slug } = req.body;

    let logo = "";

    if (req.file) {
      logo = `/uploads/${req.file.filename}`;
    }

    const brand = new Brand({
      name,
      slug,
      logo,
      userId: req.user.id,
    });

    await brand.save();

    res.status(201).json({
      success: true,
      brand,
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: "Slug must be unique for your account",
    });

  }
};

// UPDATE
exports.updateBrand = async (req, res) => {

  try {

    const { name, slug } = req.body;

    let updateData = {
      name,
      slug,
    };

    if (req.file) {
      updateData.logo = `/uploads/${req.file.filename}`;
    }

    const brand = await Brand.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.status(200).json({
      success: true,
      brand,
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message,
    });

  }

};

// DELETE
exports.deleteBrand = async (req, res) => {

  try {

    const brand = await Brand.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
    });

  } catch (error) {

    res.status(400).json({
      success: false,
      message: error.message,
    });

  }

};