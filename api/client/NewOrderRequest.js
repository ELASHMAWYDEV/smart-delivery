const express = require("express");
const router = express.Router();

/*
 *
 * This route handles new order requests sent from the client (restaurant)
 *
 */

router.post("/", async (req, res) => {
  try {

    const { } = req.body;


    

  } catch (e) {
    return res.json({
      status: false,
      message: `Error in NewOrderRequest endpoint: ${e.message}`,
    });
  }
});

module.exports = router;
