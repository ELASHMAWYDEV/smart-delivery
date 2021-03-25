const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const { updateOrderStatus } = require("../../helpers");


router.post("/", async (req, res) => {
  try {
    //Developement errors
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.json({ status: false, errors: errors.array() });
    /******************************************************/

    const { orderId, driverId } = req.body;

    //Update the order
    const updateResult = await updateOrderStatus({
      token: req.token,
      orderId,
      statusId: 4,
    });


    return res.json(updateResult);
    /******************************************************/
  } catch (e) {
    return res.json({
      status: false,
      message: `Error in NewOrderRequest endpoint: ${e.message}`,
    });
  }
});

module.exports = router;
