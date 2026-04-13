const Supplier = require("../models/Supplier");
const Customer = require("../models/Customer");

const getModel = (type) => (type === "supplier" ? Supplier : Customer);

// CREATE
exports.addPerson = async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) return res.status(400).json({ message: "Type is required" });

    const Model = getModel(type);
    const data = { ...req.body, userId: req.user.id };

    if (req.file) data.image = "/uploads/" + req.file.filename;

    const newPerson = new Model(data);
    await newPerson.save();

    res.status(201).json({ success: true, message: `${type} added`, data: newPerson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL
exports.getAllPeople = async (req, res) => {
  try {
    const { type } = req.query;
    const Model = getModel(type);
    const people = await Model.find({ userId: req.user.id }).populate("warehouse");
    res.json({ success: true, data: people });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE (Yeh miss tha aapke code mein)
exports.updatePerson = async (req, res) => {
  try {
    const { type } = req.query;
    const Model = getModel(type);
    let updateData = { ...req.body };

    if (req.file) updateData.image = "/uploads/" + req.file.filename;

    const updated = await Model.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Person not found" });

    res.json({ success: true, message: "Updated successfully", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
exports.deletePerson = async (req, res) => {
  try {
    const { type } = req.query;
    const Model = getModel(type);
    const deleted = await Model.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};