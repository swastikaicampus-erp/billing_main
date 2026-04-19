const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path"); // Static files ke liye zaroori hai
require("dotenv").config();

const app = express();

// --- CORS Setup ---
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174", 
  "http://localhost:3000",
  "https://gbbilling-ae817.web.app",
  "https://goldberry-259f6.web.app",   // ← hardcode bhi rakho backup ke liye
  process.env.FRONTEND_URL,
];

app.use(cors({
  origin: function (origin, callback) {
    // Local development aur Postman/Curl ke liye !origin allow karein
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy block: Origin not allowed'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Routes (Organized & No Duplicates) ---
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/shops", require("./routes/shopRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/brands", require("./routes/brandRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/variations", require("./routes/variationRoutes"));
app.use("/api/units", require("./routes/unitRoutes"));
app.use("/api/taxes", require("./routes/taxRoutes"));
app.use("/api/warehouses", require("./routes/warehouseRoutes"));
app.use("/api/sales", require("./routes/salesRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/purchases", require("./routes/purchaseRoutes"));
app.use("/api/suppliers", require("./routes/supplierRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/sale-returns", require("./routes/saleReturnRoutes"));
app.use("/api/purchase-returns", require("./routes/purchaseReturnRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/staff", require("./routes/staffRoutes"));
app.use("/api/people", require("./routes/peopleRoutes"));
app.use("/api/metal-rates", require("./routes/metalRatesRoute"));

// --- Database & Server ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

app.get("/", (req, res) => {
  res.send("Billing API Running ✅");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


// k@gmail.com

// SHOP2394

// K@2394