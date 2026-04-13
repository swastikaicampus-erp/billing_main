const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/UserStocks"); // Path sahi check karlein
require("dotenv").config();

const seedSuperAdmin = async () => {
  try { 
    await mongoose.connect(process.env.MONGO_URI);

    // Pehle check karein ki koi Super Admin hai toh nahi
    const adminExists = await User.findOne({ role: "super_admin" });
    if (adminExists) {
      console.log("Super Admin already exists!");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("master@123", 10); // Aapka Password

    const masterAdmin = new User({
      name: "Master Admin",
      email: "master@stockifly.com", // Aapka Master Email
      password: hashedPassword,
      role: "super_admin",
      // Super admin ki koi shopId nahi hogi
    });

    await masterAdmin.save();
    console.log("Master Admin Created Successfully!");
    console.log("Email: master@stockifly.com");
    console.log("Password: master@123");
    
    process.exit();
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedSuperAdmin();