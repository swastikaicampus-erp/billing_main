const expRouter = require("express").Router();
const expCtrl   = require("../controllers/expenseController");
expRouter.use(require("../middleware/authMiddleware").protect);
expRouter.get("/categories",    expCtrl.getCategories);
expRouter.post("/add",          expCtrl.createExpense);
expRouter.get("/all",           expCtrl.getExpenses);
expRouter.put("/update/:id",    expCtrl.updateExpense);
expRouter.delete("/delete/:id", expCtrl.deleteExpense);
module.exports = expRouter;