
// ═══════════════════════════════════════════════════════════════
// controllers/staffController.js
// ═══════════════════════════════════════════════════════════════
const Staff = require("../models/Staff");
const jwt   = require("jsonwebtoken");

exports.createStaff = async (req, res) => {
  try {
    const exists = await Staff.findOne({ email: req.body.email, shopId: req.user.shopId });
    if (exists) return res.status(400).json({ success: false, message: "Email already exists" });

    const staff = await Staff.create({ ...req.body, shopId: req.user.shopId });
    const { password: _, ...safe } = staff.toObject();
    res.status(201).json({ success: true, message: "Staff added", staff: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ shopId: req.user.shopId }).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, count: staff.length, staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    if (req.body.password) {
      // Let pre-save hook hash it
      const staff = await Staff.findOne({ _id: req.params.id, shopId: req.user.shopId });
      if (!staff) return res.status(404).json({ success: false, message: "Not found" });
      Object.assign(staff, req.body);
      await staff.save();
      const { password: _, ...safe } = staff.toObject();
      return res.json({ success: true, staff: safe });
    }
    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.shopId },
      req.body, { new: true }
    ).select("-password");
    if (!staff) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.shopId },
      { isActive: false }, { new: true }
    );
    if (!staff) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Staff deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePermissions = async (req, res) => {
  try {
    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.shopId },
      { permissions: req.body.permissions },
      { new: true }
    ).select("-password");
    if (!staff) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Permissions updated", staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// Staff login (separate from main login)
exports.staffLogin = async (req, res) => {
  try {
    const { email, password, shopId } = req.body;
    const staff = await Staff.findOne({ email, shopId, isActive: true });
    if (!staff || !(await staff.matchPassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    staff.lastLogin = new Date();
    await staff.save();
 
    const token = jwt.sign(
      { id: staff._id, shopId: staff.shopId, role: staff.role, permissions: staff.permissions },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ success: true, token, staff: { ...staff.toObject(), password: undefined } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};