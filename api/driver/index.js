const express = require("express");
const router = express.Router();




router.use("/AcceptOrder", require("./AcceptOrder"));




module.exports = router;