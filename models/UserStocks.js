const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type:    String,
      enum:    ["super_admin", "admin", "staff"],
      default: "admin",
    },
    shopId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Shop",
      required: function () { return this.role !== "super_admin"; },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("UserStock", userSchema);