const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/supplierController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/all",           ctrl.getSuppliers);
router.post("/add",          ctrl.createSupplier);
router.get("/:id",           ctrl.getSupplier);
router.put("/update/:id",    ctrl.updateSupplier);
router.delete("/delete/:id", ctrl.deleteSupplier);
router.patch("/toggle/:id",  ctrl.toggleActive);

module.exports = router;