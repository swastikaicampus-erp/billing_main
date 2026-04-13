const prRouter = require("express").Router();
const prCtrl   = require("../controllers/purchaseReturnController");
prRouter.use(require("../middleware/authMiddleware").protect);
prRouter.post("/add",   prCtrl.createPurchaseReturn);
prRouter.get("/all",    prCtrl.getPurchaseReturns);
prRouter.get("/:id",    prCtrl.getPurchaseReturn);
module.exports = prRouter;