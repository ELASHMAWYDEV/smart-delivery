const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const orderValidator = require("../../validators/order");

//Helpers
const {
  createOrder,
  checkDriversOnWay,
  sendRequestToDriver,
} = require("../../helpers");
const findNearestDriver = require("../../helpers/findNearestDriver");

/*
 *
 * This route handles new order requests sent from the client (restaurant)
 *
 */

router.post("/", orderValidator, async (req, res) => {
  try {
    let orders = [];

    //Will receive array || object

    if (Array.isArray(req.body)) orders = [...orders, ...req.body];
    else orders = [req.body];

    /******************************************************/

    //Developement errors
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.json({ status: false, errors: errors.array() });

    /******************************************************/
    //Create the order on DB & API

    for (let i = 0; i < orders.length; i++) {
      const {
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
      } = orders[i];


      const createOrderResult = await createOrder({
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

      if (!createOrderResult.status) return res.json(createOrderResult);

      let { order } = createOrderResult;

      /******************************************************/
      /*
       *
       * @param order
       * We will work with order variable from here on
       *
       *
       */
      /******************************************************/
      //Check if any driver on the way to this restaurant

      let driversOnWay = await checkDriversOnWay({ branchId });

      //Send request to driversOnWay
      if (driversOnWay.status) {
        let { drivers } = driversOnWay;
        const result = await sendRequestToDriver({
          driver: drivers[0],
          orderId: order.master.orderId,
        });

        //Send the result to client
        return res.json(result);
      }
      /******************************************************/
      /******************************************************/

      //Find nearest driver & send request to him
      let nearestDriver = await findNearestDriver({
        location: order.master.receiverLocation,
      });

      if (!nearestDriver.status) {
        return res.json(nearestDriver);
      }

      const sendRequestResult = await sendRequestToDriver({
        driver: nearestDriver.driver,
        orderId: order.master.orderId,
      });

      return res.json(sendRequestResult);
    } //End for loop {orders}

    /******************************************************/
  } catch (e) {
    return res.json({
      status: false,
      message: `Error in NewOrderRequest endpoint: ${e.message}`,
    });
  }
});

module.exports = router;
