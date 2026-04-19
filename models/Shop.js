// models/Shop.js — Added rawPassword (encrypted) for credential reveal
const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    shopName:    { type: String, required: true, trim: true },
    ownerName:   { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    address:     { type: String, default: "", trim: true },
    gstNo:       { type: String, default: "", trim: true, uppercase: true },
    isActive:    { type: Boolean, default: true },
    loginId:     { type: String, unique: true },
    password:    { type: String },                 // bcrypt hash
    rawPassword: { type: String, select: false },  // AES-encrypted plain text
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shop", shopSchema);