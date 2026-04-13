const payRouter = require("express").Router();
const payCtrl   = require("../controllers/paymentController");
payRouter.use(require("../middleware/authMiddleware").protect);
payRouter.post("/add",                          payCtrl.createPayment);
payRouter.get("/all",                           payCtrl.getPayments);
payRouter.get("/ledger/:partyType/:partyId",    payCtrl.getLedger);
module.exports = payRouter;
