const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop");
const { protect, superAdminOnly } = require("../middleware/authMiddleware");
const {
  createShop,
  getAllShops,
  toggleShopStatus,
  getShopById,
} = require("../controllers/shopController");

router.post("/", protect, superAdminOnly, createShop);
router.get("/", protect, superAdminOnly, getAllShops);

// ✅ /my-shop PEHLE — /:id se upar hona chahiye
router.get("/my-shop", protect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shopId).select("-password");
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Yeh sab /my-shop ke BAAD
router.get("/:id", protect, superAdminOnly, getShopById);
router.patch("/:id/toggle", protect, superAdminOnly, toggleShopStatus);
router.patch("/:id", protect, superAdminOnly, async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select("-password");
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.delete("/:id", protect, superAdminOnly, async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    res.json({ success: true, message: "Shop deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;