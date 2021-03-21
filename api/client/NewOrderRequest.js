const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const orderValidator = require("../../validators/order");

//Helpers
const { createOrder } = require("../../helpers");

/*
 *
 * This route handles new order requests sent from the client (restaurant)
 *
 */

router.post("/", orderValidator, async (req, res) => {
  try {
    //Will receive array
    const {
      receiverName,
      receiverMobile,
      receiverAddress,
      receiverLocation,
      branchId = null,
      isPaid,
      storeCost,
      receiverCollected,
      discount,
      tax,
      deliveryCost,
      items,
    } = req.body;

    console.log(req.token);

    //Developement errors
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.json({ status: false, errors: errors.array() });

    //Create the order on DB & API
    const result = await createOrder({
      token: req.token,
      receiverName,
      receiverMobile,
      receiverAddress,
      receiverLocation,
      branchId,
      isPaid,
      storeCost,
      receiverCollected,
      discount,
      tax,
      deliveryCost,
      items,
    });

    if (!result.status) {
      return res.json(result);
    } else {
      return res.json(result);
    }
  } catch (e) {
    return res.json({
      status: false,
      message: `Error in NewOrderRequest endpoint: ${e.message}`,
    });
  }
});

module.exports = router;
