const express = require("express");
const router = express.Router();
const { addPerson, getAllPeople, deletePerson, updatePerson } = require("../controllers/peopleController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All routes are protected
router.use(protect);

router.post("/add", upload.single("image"), addPerson);
router.get("/all", getAllPeople);
router.put("/update/:id", upload.single("image"), updatePerson); // Update route added
router.delete("/delete/:id", deletePerson);

module.exports = router;