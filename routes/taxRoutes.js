const express = require("express");
const router  = express.Router();
const { getTaxes, createTax, deleteTax } = require("../controllers/taxController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.get("/all",          getTaxes);
router.post("/add",         createTax);
router.delete("/delete/:id", deleteTax);

module.exports = router;