const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const Customer = require("../models/Customer");

const { protect } = require("../middleware/authMiddleware");

// customerRoutes.js — CORRECT ORDER

router.use(protect);

// ✅ Sabse pehle specific named routes
router.get("/summary", customerController.getCustomerSummary);
router.get("/all", customerController.getCustomers);
router.get("/udhaar", async (req, res) => {          // ← YE /:id se PEHLE aana chahiye
    try {
        const customers = await Customer.find({
            shopId: req.user.shopId,
            totalDue: { $gt: 0 },
        })
            .select("name phone totalDue")
            .sort({ totalDue: -1 })
            .limit(10)
            .lean();

        res.json({ success: true, customers });
    } catch (err) {
        console.error("Udhaar error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post("/add", customerController.createCustomer);

// ✅ :id wale routes BAAD mein
router.get("/:id", customerController.getCustomer);
router.put("/update/:id", customerController.updateCustomer);
router.delete("/delete/:id", customerController.deleteCustomer);
router.get("/:id/history", customerController.getCustomerHistory);
router.post("/:id/record-payment", customerController.recordPayment);

module.exports = router;

module.exports = router;