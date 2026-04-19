const User   = require("../models/UserStocks");
const Shop   = require("../models/Shop");
const jwt    = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email aur password required hai",
      });
    }

    const identifier = email.toLowerCase().trim();

    // ── Step 1: User dhundo ──────────────────────────────────────────────────
    const user = await User.findOne({ email: identifier });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // ── Step 2: Role ke hisaab se password check ─────────────────────────────
    let isMatch = false;

    if (user.role === "super_admin") {
      // ✅ Super admin — password User model mein hashed hai
      isMatch = await bcrypt.compare(password, user.password);

    } else {
      // ✅ Shop admin/staff — password Shop model mein hashed hai
      const shop = await Shop.findById(user.shopId).select("+password");

      if (!shop) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      if (!shop.isActive) {
        return res.status(403).json({
          success: false,
          message: "Shop deactivated hai. Support se contact karo.",
        });
      }

      isMatch = await bcrypt.compare(password, shop.password);
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // ── Step 3: Token banao ───────────────────────────────────────────────────
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