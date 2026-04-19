const express = require("express");
const router = express.Router();
const { login } = require("../controllers/authController");

// POST /api/auth/login
router.post("/login", login);


// router.post("/create-admin", async (req, res) => {
//   try {
//     const User = require("../models/UserStocks");

//     // Saare super_admin delete karo — email se nahi, role se
//     await User.deleteMany({ role: "super_admin" });

//     const user = await User.create({
//       name:     "Master Admin",
//       email:    "supermaster@billingsystem.com",
//       password: "Master#9977$Secure",
//       role:     "super_admin"
//     });

//     res.json({
//       message:  "Done!",
//       email:    user.email,
//       password: "Master#9977$Secure"
//     });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

module.exports = router;