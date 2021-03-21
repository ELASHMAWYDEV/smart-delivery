const express = require("express");
const router = express.Router();




router.use("/NewOrderRequest", require("./NewOrderRequest"));




module.exports = router;