const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
{
  name: { 
    type: String, 
    required: true 
  },

  slug: { 
    type: String, 
    required: true 
  },

  logo: { 
    type: String 
  },

  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null
  },

  // user wise data separation
  userId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

},
{ timestamps: true }
);

// same user same slug nahi bana sakta
categorySchema.index({ slug: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);