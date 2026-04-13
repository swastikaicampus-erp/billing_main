const staffRouter = require("express").Router();
const staffCtrl = require("../controllers/staffController");
const { protect } = require("../middleware/authMiddleware");
staffRouter.post("/login", staffCtrl.staffLogin);  // public
staffRouter.use(protect);
staffRouter.post("/add", staffCtrl.createStaff);
staffRouter.get("/all", staffCtrl.getStaff);
staffRouter.put("/update/:id", staffCtrl.updateStaff);
staffRouter.delete("/delete/:id", staffCtrl.deleteStaff);
staffRouter.patch("/permissions/:id", staffCtrl.updatePermissions);
module.exports = staffRouter;
