const express = require("express");
const router = express.Router();
const warehouseController = require("../controllers/warehouseController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/all", warehouseController.getWarehouses); // Frontend matching
router.post("/add", warehouseController.createWarehouse);
router.put("/:id", warehouseController.updateWarehouse);
router.delete("/:id", warehouseController.deleteWarehouse);

module.exports = router;