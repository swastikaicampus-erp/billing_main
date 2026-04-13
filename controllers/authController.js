const User = require("../models/UserStocks");
const Shop = require("../models/Shop");
const jwt  = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.login = async (req, res) => {
  try {
    const { email, loginId, password } = req.body;

    if (!password || (!email && !loginId)) {
      return res.status(400).json({
        success: false,
        message: "Email/LoginId aur password required hai",
      });
    }

    let user = null;

    // ✅ Case 1 — Super Admin: email se login
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    // ✅ Case 2 — Shop: loginId se login
    if (loginId) {
      // Shop dhundo loginId se
      const shop = await Shop.findOne({ loginId: loginId.trim() });

      if (!shop) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      // Shop active hai?
      if (!shop.isActive) {
        return res.status(403).json({ success: false, message: "Shop deactivated hai" });
      }

      // Shop ka password check
      const shopPassMatch = await bcrypt.compare(password, shop.password);
      if (!shopPassMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      // Shop ka user dhundo
      user = await User.findOne({ shopId: shop._id, role: "admin" });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Email login ke liye password check
    if (email) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }
    }

    // ✅ Token mein id + role + shopId teeno
    const token = jwt.sign(
      {
        id:     user._id,
        role:   user.role,
        shopId: user.shopId || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        role:   user.role,
        shopId: user.shopId || null,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};