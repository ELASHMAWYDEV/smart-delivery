const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const orderValidator = require("../../validators/order");

//Helpers
const {
  createOrder,
  checkDriversOnWay,
  sendRequestToDriver,
  findNearestDriver,
} = require("../../helpers");

const { activeOrderDrivers } = require("../../globals");

/*
 *
 * This route handles new order requests sent from the client (restaurant)
 *
 */

router.post("/", orderValidator, async (req, res) => {
  try {
    //Developement errors
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.json({ status: false, errors: errors.array() });

    /******************************************************/

    //Will receive array || object
    let orders = [];

    if (Array.isArray(req.body)) orders = [...orders, ...req.body];
    else orders = [req.body];

    /******************************************************/
    //Create the order on DB & API

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
    } = orders[0];

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
    activeOrderDrivers.set(order.master.orderId, []);

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

    //Find nearest driver & send request to him
    let nearestDriverResult = await findNearestDriver({
      location: order.master.receiverLocation,
      orderId: order.master.orderId,
    });

    if (!nearestDriverResult.status) {
      return res.json(nearestDriverResult);
    }

    /******************************************************/

    //Send the request to driver
    const sendRequestResult = await sendRequestToDriver({
      driver: nearestDriverResult.driver,
      orderId: order.master.orderId,
    });

    if (sendRequestResult.status) {
      //Check if there
    }

    return res.json(sendRequestResult);

    /******************************************************/
  } catch (e) {
    return res.json({
      status: false,
      message: `Error in NewOrderRequest endpoint: ${e.message}`,
    });
  }
});

module.exports = router;
