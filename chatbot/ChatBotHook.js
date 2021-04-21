const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  console.log("chat hook",req.body);
	res.json(req.body);
});

module.exports = router;
