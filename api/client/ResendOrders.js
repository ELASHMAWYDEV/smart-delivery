const Sentry = require("@sentry/node");
const express = require("express");
const router = express.Router();

//Helpers
const orderCycle = require("../../helpers/orderCycle");

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

    console.log(
      `Resend, Orders: [${
        ordersExist && ordersExist.map((order) => order.master.orderId)
      }], drivers: [${drivers && drivers.map((driver) => driver)}]`
    );
    Promise.all(
      ordersExist.map(async (order) => {
        //Update Order status
        await OrderModel.updateOne(
          { "master.orderId": order.master.orderId },
          { "master.statusId": 1 }
        );

        console.log(
          `Started cycle from ResendOrders, order ${order.master.orderId}`
        );
        orderCycle({
          orderId: order.master.orderId,
          driversIds: drivers || [],
          orderDriversLimit: orderDriversLimit || 2,
        });
      })
    );
    /***********************************************************/
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
