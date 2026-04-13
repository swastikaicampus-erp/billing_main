const jwt  = require("jsonwebtoken");
const Shop = require("../models/Shop");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // ✅ Deactivated shop ke users block karo
      // super_admin ka koi shopId nahi hota — unhe skip karo
      if (decoded.shopId) {
        const shop = await Shop.findById(decoded.shopId).select("isActive");
        if (shop && !shop.isActive) {
          return res.status(403).json({
            success: false,
            message: "Your shop has been deactivated. Please contact support.",
          });
        }
      }

      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token invalid or expired",
      });
    }
  }

  return res.status(401).json({
    success: false,
    message: "No token, authorization denied",
  });
};

const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === "super_admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied — Super Admin only",
  });
};

module.exports = { protect, superAdminOnly };