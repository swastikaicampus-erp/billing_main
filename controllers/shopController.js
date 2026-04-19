const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Shop   = require("../models/Shop");
const User   = require("../models/UserStocks");

// ── Encryption helpers ────────────────────────────────────────────────────────
const ALGO = "aes-256-cbc";
const KEY  = Buffer.from(
  (process.env.ENCRYPTION_KEY || "12345678901234567890123456789012").slice(0, 32)
);

function encryptPassword(plain) {
  const iv        = crypto.randomBytes(16);
  const cipher    = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// ── Create Shop ───────────────────────────────────────────────────────────────
exports.createShop = async (req, res) => {
  try {
    const { shopName, ownerName, email, phone, address, gstNo } = req.body;

    if (!shopName || !ownerName || !email || !phone) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const existing = await Shop.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const randomNum  = Math.floor(1000 + Math.random() * 9000);
    const loginId    = `SHOP${randomNum}`;
    const rawPass    = `${shopName.slice(0, 4).toUpperCase()}@${randomNum}`;
    const hashedPass = await bcrypt.hash(rawPass, 10);
    const encPass    = encryptPassword(rawPass);

    // ── Shop create karo ──────────────────────────────────────────────────────
    const shop = await Shop.create({
      shopName:    shopName.trim(),
      ownerName:   ownerName.trim(),
      email:       email.toLowerCase().trim(),
      phone:       phone.trim(),
      address:     address?.trim()  || "",
      gstNo:       gstNo?.trim().toUpperCase() || "",
      loginId,
      password:    hashedPass,  // bcrypt hash
      rawPassword: encPass,     // AES encrypted — reveal ke liye
    });

    // ── Admin User create karo ────────────────────────────────────────────────
    // ✅ rawPass direct do — UserStocks pre-save hook khud hash karega
    // ❌ Kabhi hashedPass mat do — double hashing ho jaayegi
    await User.create({
      name:     ownerName.trim(),
      email:    email.toLowerCase().trim(),
      password: rawPass,   // plain text — hook hash karega
      role:     "admin",
      shopId:   shop._id,
    });

    res.status(201).json({
      success: true,
      credentials: { loginId, password: rawPass },
      shop: { shopName: shop.shopName, email: shop.email },
    });

  } catch (error) {
    console.error("CREATE SHOP ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get All Shops ─────────────────────────────────────────────────────────────
exports.getAllShops = async (req, res) => {
  try {
    const shops = await Shop
      .find()
      .select("-password -rawPassword")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: shops.length, shops });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Get Single Shop ───────────────────────────────────────────────────────────
exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).select("-password -rawPassword");
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    res.status(200).json({ success: true, shop });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Toggle Active / Inactive ──────────────────────────────────────────────────
exports.toggleShopStatus = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

    shop.isActive = !shop.isActive;
    await shop.save();

    res.status(200).json({
      success:  true,
      message:  `Shop ${shop.isActive ? "activated" : "deactivated"}`,
      isActive: shop.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};