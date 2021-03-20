const express = require("express");
const router = express.Router();




//Client
router.post('/client', require("./client"));



//Driver





module.exports = router;