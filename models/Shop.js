const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    shopName:  { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    phone:     { type: String, required: true },
    address:   { type: String, default: "" },
    gstNo:     { type: String, default: "" },
    isActive:  { type: Boolean, default: true },
    loginId:   { type: String, unique: true },
    password:  { type: String }, // hashed
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shop", shopSchema);