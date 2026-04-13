const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  logo: { type: String },
  // Is line se data filter hoga
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  }
}, { timestamps: true });

// Taki ek hi user do same slug na bana sake, lekin alag users bana sakein
brandSchema.index({ slug: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Brand", brandSchema);