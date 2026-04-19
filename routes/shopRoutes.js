// ─────────────────────────────────────────────────────────────────────────────
// shopRoutes.js  —  Complete with credentials reveal route
// ─────────────────────────────────────────────────────────────────────────────
const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const Shop    = require("../models/Shop");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");
const {
  createShop,
  getAllShops,
  toggleShopStatus,
  getShopById,
} = require("../controllers/shopController");

// ── Create / List ─────────────────────────────────────────────────────────────
router.post("/",  protect, superAdminOnly, createShop);
router.get("/",   protect, superAdminOnly, getAllShops);

// ── My Shop (shop-admin own profile) — MUST be before /:id ───────────────────
router.get("/my-shop", protect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shopId).select("-password");
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Credentials Reveal (super-admin only) ────────────────────────────────────
// Returns the plain-text password stored in the User (admin) document for this shop.
// The Shop model stores only a bcrypt hash; the plain password lives in
// the corresponding User doc if you saved it there — adjust as needed.
//
// Strategy A: Store raw password encrypted in Shop (recommended below).
// Strategy B: Reset password and return a new one (destructive).
//
// Below uses Strategy A — we store an AES-encrypted copy in shop.rawPassword.
// If you haven't added that field yet, the fallback is to generate a reset.

router.get("/:id/credentials", protect, superAdminOnly, async (req, res) => {
  try {
    // Include rawPassword field (normally excluded)
    const shop = await Shop.findById(req.params.id).select("+rawPassword");
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

    // If you stored the encrypted raw password:
    if (shop.rawPassword) {
      const plainPassword = decryptPassword(shop.rawPassword); // see helper below
      return res.json({
        success: true,
        credentials: {
          loginId:  shop.loginId,
          password: plainPassword,
        },
      });
    }

    // Fallback: generate a new password, update hash, return it
    const randomNum   = Math.floor(1000 + Math.random() * 9000);
    const newPassword = `${shop.shopName.slice(0, 4).toUpperCase()}@${randomNum}`;
    shop.password     = await bcrypt.hash(newPassword, 10);
    shop.rawPassword  = encryptPassword(newPassword);
    await shop.save();

    // Also update the User (admin) document's password
    const User = require("../models/UserStocks");
    await User.findOneAndUpdate(
      { shopId: shop._id, role: "admin" },
      { password: newPassword } // pre-save hook will hash it
    );

    res.json({
      success: true,
      credentials: {
        loginId:  shop.loginId,
        password: newPassword,
      },
      note: "Password was reset because original was not stored. New password issued.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Single shop ───────────────────────────────────────────────────────────────
router.get("/:id", protect, superAdminOnly, getShopById);

// ── Toggle active / inactive ──────────────────────────────────────────────────
router.patch("/:id/toggle", protect, superAdminOnly, toggleShopStatus);

// ── Update shop fields ────────────────────────────────────────────────────────
router.patch("/:id", protect, superAdminOnly, async (req, res) => {
  try {
    const allowed = ["shopName", "ownerName", "email", "phone", "address", "gstNo"];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password -rawPassword");

    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Delete shop ───────────────────────────────────────────────────────────────
router.delete("/:id", protect, superAdminOnly, async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });

    // Also delete the shop's admin user
    const User = require("../models/UserStocks");
    await User.deleteMany({ shopId: req.params.id });

    res.json({ success: true, message: "Shop deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;


// ─────────────────────────────────────────────────────────────────────────────
// Simple symmetric encryption helpers
// Uses AES-256-CBC via Node's built-in `crypto` module.
// Set ENCRYPTION_KEY in your .env (must be exactly 32 characters).
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require("crypto");
const ALGO   = "aes-256-cbc";
const KEY    = Buffer.from(
  (process.env.ENCRYPTION_KEY || "12345678901234567890123456789012").slice(0, 32)
);

function encryptPassword(plain) {
  const iv         = crypto.randomBytes(16);
  const cipher     = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted  = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptPassword(stored) {
  const [ivHex, encHex] = stored.split(":");
  const iv              = Buffer.from(ivHex, "hex");
  const enc             = Buffer.from(encHex, "hex");
  const decipher        = crypto.createDecipheriv(ALGO, KEY, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}