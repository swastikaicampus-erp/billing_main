const Shop = require("../models/Shop");
const User = require("../models/UserStocks");
const bcrypt = require("bcryptjs");

exports.createShop = async (req, res) => {
  try {
    const { shopName, ownerName, email, phone, address, gstNo } = req.body;

    // 1. Validation log
    if (!shopName || !ownerName || !email || !phone) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 2. Email duplication check
    const existing = await Shop.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const loginId = `SHOP${randomNum}`;
    const rawPass = `${shopName.slice(0, 4).toUpperCase()}@${randomNum}`;

    // Hash password for Shop model
    const hashedPass = await bcrypt.hash(rawPass, 10);

    // 3. Create Shop
    const shop = await Shop.create({
      shopName,
      ownerName,
      email: email.toLowerCase().trim(),
      phone,
      address,
      gstNo,
      loginId,
      password: hashedPass,
    });

    // 4. Create Admin User for this shop
    // Make sure 'User' model is imported correctly at the top
    await User.create({
      name: ownerName,
      email: email.toLowerCase().trim(),
      password: rawPass, // Pre-save hook will hash this
      role: "admin",
      shopId: shop._id,
    });

    res.status(201).json({
      success: true,
      credentials: { loginId, password: rawPass },
      shop: { shopName: shop.shopName, email: shop.email }  // ← yeh add karo
    });

  } catch (error) {
    console.error("DETAILED ERROR:", error); // Yeh terminal mein error dikhayega
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Saari shops
exports.getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: shops.length, shops });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Single shop
exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).select("-password");
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop nahi mili" });
    }
    res.status(200).json({ success: true, shop });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Activate / Deactivate
exports.toggleShopStatus = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop nahi mili" });
    }
    shop.isActive = !shop.isActive;
    await shop.save();

    res.status(200).json({
      success: true,
      message: `Shop ${shop.isActive ? "activate" : "deactivate"} ho gayi`,
      isActive: shop.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};