const express = require("express");
const router = express.Router();
const { login } = require("../controllers/authController");

// POST /api/auth/login
router.post("/login", login);
router.post("/create-admin", async (req, res) => {
  try {
    const User = require("../models/UserStocks");

    const user = await User.create({
      name: "Super Admin",
      email: "admin@gmail.com",
      password: "Admin@123",
      role: "super_admin"
    });

    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;