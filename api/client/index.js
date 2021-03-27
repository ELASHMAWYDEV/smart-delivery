const express = require("express");
const router = express.Router();

router.use("/NewOrderRequest", require("./NewOrderRequest"));
router.use("/CancelOrder", require("./CancelOrder"));

module.exports = router;
