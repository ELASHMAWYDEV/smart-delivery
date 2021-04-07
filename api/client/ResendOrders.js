const Sentry = require("@sentry/node");
const express = require("express");
const router = express.Router();
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

const { ordersInterval, activeOrderDrivers } = require("../../globals");

const OrderModel = require("../../models/Order");
/*
 *
 * This route handles orders that has been registered as not found
 * Orders could be sent to certain drivers (with orderDriversLimit or not)
 *
 */

router.post("/", async (req, res) => {
  try {
    const { orders, drivers, orderDriversLimit } = req.body;

    //Validation
    if (!orders || !Array.isArray(orders))
      return res.json({
        status: false,
        message: "You have not sent any orders !",
      });

    //Init vars
    let ordersNotExist = []; //Ids
    let ordersExist = []; //Orders Objects from search
    /******************************************************/
    //Check if orders exist
    let ordersSearch = await OrderModel.find({
      "master.orderId": { $in: orders },
      "master.statusId": 2,
    });

    //Extract not found orders Ids
    for (let originalOrderId of orders) {
      let isFound = false;

      for (let savedOrder of ordersSearch) {
        if (originalOrderId == savedOrder.master.orderId) {
          isFound = true;
          ordersExist.push(savedOrder);
        }
      }

      if (!isFound) {
        ordersNotExist.push(originalOrderId);
      }
    }

    res.json({
      status: true,
      message: "Request have been resent to drivers",
      successfullOrders: ordersExist.map((order) => order.master.orderId),
      failedOrders: ordersNotExist,
    });

    /******************************************************/

    //Loop through orders
    for (let order of ordersExist) {
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

        //Update Order status
        await OrderModel.updateOne(
          { "master.orderId": order.master.orderId },
          { "master.statusId": 1 }
        );

        //Check if any driver on the way to this restaurant
        let driverOnWay = await checkDriverOnWay({
          branchId: order.master.branchId,
          orderId: order.master.orderId,
          driversIds: drivers,
          orderDriversLimit: orderDriversLimit || 2,
        });

        //Send request to driverOnWay
        if (driverOnWay.status) {
          let { driver } = driverOnWay;
          const result = await sendRequestToDriver({
            driver,
            orderId: order.master.orderId,
            driversIds: drivers,
            orderDriversLimit: orderDriversLimit || 2,
          });

          //Continue if order was sent to the driver
          if (result.status) {
            console.log(
              `Order ${order.master.orderId} was Resent to driver ${driver.driverId} on way`
            );
            continue;
          }
        }

        /******************************************************/

        //Find nearest driver & send request to him
        let nearestDriverResult = await findNearestDriver({
          orderId: order.master.orderId,
          driversIds: drivers,
        });

        if (nearestDriverResult.status) {
          //Send the request to driver
          const result = await sendRequestToDriver({
            driver: nearestDriverResult.driver,
            orderId: order.master.orderId,
            driversIds: drivers,
            orderDriversLimit: orderDriversLimit || 2,
          });

          //Continue if order was sent to the driver
          if (result.status) {
            console.log(
              `Order ${order.master.orderId} was Resent to driver ${nearestDriverResult.driver.driverId}`
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

    console.log(`Error in ResendOrders endpoint: ${e.message}`, e);
    if (!res.headersSent) {
      return res.json({
        status: false,
        message: `Error in ResendOrders endpoint: ${e.message}`,
      });
    }
  }
});

module.exports = router;
