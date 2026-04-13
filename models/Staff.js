
// ═══════════════════════════════════════════════════════════════
// models/Staff.js
// ═══════════════════════════════════════════════════════════════
const mongoose = require("mongoose");

const bcrypt   = require("bcryptjs");

const staffSchema = new mongoose.Schema({
  shopId:    { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, trim: true, lowercase: true },
  phone:     { type: String, default: "" },
  password:  { type: String, required: true },
  role:      { type: String, enum: ["admin", "staff", "cashier"], default: "staff" },
  // Permissions
  permissions: {
    billing:   { type: Boolean, default: true  },
    products:  { type: Boolean, default: false },
    purchases: { type: Boolean, default: false },
    customers: { type: Boolean, default: true  },
    reports:   { type: Boolean, default: false },
    expenses:  { type: Boolean, default: false },
    returns:   { type: Boolean, default: false },
  },
  isActive:  { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

staffSchema.index({ email: 1, shopId: 1 }, { unique: true });

staffSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

staffSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("Staff", staffSchema);