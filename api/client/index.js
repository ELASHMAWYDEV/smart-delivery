const express = require("express");
const router = express.Router();

router.use("/NewOrderRequest", require("./NewOrderRequest"));
router.use("/CancelOrder", require("./CancelOrder"));
router.use("/ResendOrders", require("./ResendOrders"));
router.use("/PayOrder", require("./PayOrder"));
router.use("/UpdateLocation", require("./UpdateLocation"));

module.exports = router;
