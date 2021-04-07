const Sentry = require("@sentry/node");
const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const orderValidator = require("../../validators/order");
const DeliverySettingsModel = require("../../models/DeliverySettings");
const { Mutex } = require("async-mutex");
const mutex = new Mutex();

//Helpers
const {
  createOrder,
  checkDriverOnWay,
  sendRequestToDriver,
  findNearestDriver,
  updateOrderStatus,
} = require("../../helpers");

const {
  ordersInterval,
  activeOrderDrivers,
  driverBusyOrdersAndBranch,
} = require("../../globals");

const OrderModel = require("../../models/Order");
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
    const createOrderResult = await createOrder({
      token: req.token,
      orders,
    });

    if (!createOrderResult.status) return res.json(createOrderResult);

    let { orders: ordersAfterSave, failedOrders } = createOrderResult;

    //Send response to client
    res.json({
      status: true,
      message: "تم ارسال جميع الطلبات ويتم توزيعها علي السائقين الأن",
      successOrders:
        (ordersAfterSave &&
          ordersAfterSave.map((order) => order.master.orderId)) ||
        [],
      failedOrders,
    });
    /******************************************************/
    /*
     *
     * @param order
     * We will work with order variable from here on
     *
     *
     */
    /******************************************************/

    //Get globalIntervals

    //Loop through orders
    for (let order of ordersAfterSave) {
      /*
       *
       *
       * @@@@@WARNING@@@@
       *   Mutext is BLOCKING code execution here
       *   Make sure to RELEASE in finally
       * @@@@@WARNING@@@@
       *
       *
       * */

      const release = await mutex.acquire(); //Block code execution for sequentially placing orders

      /***********************************************************/
      try {
        //Put the trip at the ordersInterval map
        ordersInterval.set(parseInt(order.master.orderId), {
          order,
          timeoutFunction: setTimeout(() => null, 0),
        });

        //Init the activeOrderDrivers array
        activeOrderDrivers.set(order.master.orderId, []);

        //Check if any driver on the way to this restaurant
        let driverOnWay = await checkDriverOnWay({
          branchId: order.master.branchId,
          orderId: order.master.orderId,
        });

        //Send request to driverOnWay
        if (driverOnWay.status) {
          let { driver } = driverOnWay;
          const result = await sendRequestToDriver({
            driver,
            orderId: order.master.orderId,
          });

          //Continue if order was sent to the driver
          if (result.status) {
            console.log(
              `Order ${order.master.orderId} was sent to driver ${driver.driverId} on way`
            );
            continue;
          }
        }

        /******************************************************/

        //Find nearest driver & send request to him
        let nearestDriverResult = await findNearestDriver({
          orderId: order.master.orderId,
        });

        if (nearestDriverResult.status) {
          //Send the request to driver
          const result = await sendRequestToDriver({
            driver: nearestDriverResult.driver,
            orderId: order.master.orderId,
          });

          //Continue if order was sent to the driver
          if (result.status) {
            console.log(
              `Order ${order.master.orderId} was sent to driver ${nearestDriverResult.driver.driverId}`
            );
            continue;
          }
        }
        /******************************************************/

        console.log(`Order ${order.master.orderId}, no drivers found`);
        //Set the order to not found
        const result = await updateOrderStatus({
          orderId: order.master.orderId,
          statusId: 2,
        });

        if (!result.status) {
          throw new Error(result.message);
        }

        //Update the order
        await OrderModel.updateOne(
          {
            "master.orderId": order.master.orderId,
          },
          {
            $set: {
              "master.statusId": 2, //Not found
              "master.driverId": null,
            },
          }
        );

        ordersInterval.delete(parseInt(order.master.orderId));
      } finally {
        release(); //Release the mutex blocking
      }
    }

    /******************************************************/
  } catch (e) {
    Sentry.captureException(e);

    console.log(`Error in NewOrderRequest endpoint: ${e.message}`, e);
    if (!res.headersSent) {
      return res.json({
        status: false,
        message: `Error in NewOrderRequest endpoint: ${e.message}`,
      });
    }
  }
});

module.exports = router;
