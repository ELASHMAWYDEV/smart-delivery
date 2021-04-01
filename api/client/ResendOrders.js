const express = require("express");
const router = express.Router();

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
    if (!orders || Array.isArray(orders))
      return res.json({
        status: false,
        message: "You have not sent any orders !",
      });

    //Init vars
    let ordersNotExist = [];
    /******************************************************/
    //Check if orders exist

    

    /******************************************************/
  } catch (e) {
    if (!res.headersSent) {
      return res.json({
        status: false,
        message: `Error in ResendOrders endpoint: ${e.message}`,
      });
    }
    console.log(`Error in ResendOrders endpoint: ${e.message}`, e);
  }
});

module.exports = router;
