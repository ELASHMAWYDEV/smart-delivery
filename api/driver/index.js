const express = require("express");
const router = express.Router();




router.use("/AcceptOrder", require("./AcceptOrder"));
router.use("/IgnoreOrder", require("./IgnoreOrder"));
router.use("/RejectOrder", require("./RejectOrder"));




module.exports = router;