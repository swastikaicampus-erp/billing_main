const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    name:    { type: String, required: true, trim: true },
    phone:   { type: String, default: "" },
    email:   { type: String, default: "" },
    address: { type: String, default: "" },
    city:    { type: String, default: "" },

    // Udhaar / Khata
    totalDue:  { type: Number, default: 0 }, // kitna baaki hai abhi
    totalPaid: { type: Number, default: 0 }, // abhi tak kitna pay kiya

    isActive: { type: Boolean, default: true },
    notes:    { type: String, default: "" },
  },
  { timestamps: true }
);

// Ek shop mein same phone dobara nahi — optional unique
customerSchema.index({ phone: 1, shopId: 1 }, {
  unique: true,
  partialFilterExpression: { phone: { $ne: "" } },
});

module.exports = mongoose.model("Customer", customerSchema);