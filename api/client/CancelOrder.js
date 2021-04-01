const express = require("express");
const router = express.Router();
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const { io } = require("../../index");
const { drivers, activeOrders } = require("../../globals");
const { sendNotification } = require("../../helpers");

router.post("/", async (req, res) => {
  try {
    let { orderId } = req.body;

    //Developmemt Errors
    if (!orderId)
      return res.json({ status: false, message: "orderId is missing" });

    orderId = parseInt(orderId);
    /******************************************************/
    //Search for the order
    const orderSearch = await OrderModel.findOne({
      "master.orderId": orderId,
      "master.statusId": { $nin: [2, 6] },
    });

    if (!orderSearch)
      return res.json({
        status: false,
        message: `There is no order with id #${orderId} or the order has been canceled before, or no drivers were found for this order`,
      });

    console.log(`CancelOrder route was called, order: ${orderId}`);
    /******************************************************/

    //Set the order to status cancel
    await OrderModel.updateOne(
      { "master.orderId": orderId },
      { "master.statusId": 6 }
    );

    /******************************************************/
    //Check if there was a driver on this order & get his orders & update his busy state
    if (orderSearch.master.driverId) {
      /******************************************************/
      //Check if driver has any busy orders
      const busyOrders = await OrderModel.countDocuments({
        "master.statusId": { $in: [1, 3, 4] },
        "master.driverId": orderSearch.master.driverId,
      });

      //Set the driver to be not busy
      await DriverModel.updateOne(
        {
          driverId: orderSearch.master.driverId,
        },
        {
          isBusy: busyOrders > 0 ? true : false,
        }
      );

      /******************************************************/
      //Get the driver
      const driverSearch = await DriverModel.findOne({
        driverId: orderSearch.master.driverId,
      });

      /******************************************************/
      //Remove the trip from activeOrders
      activeOrders.delete(orderId);

      /******************************************************/

      //Send notification to the driver
      await sendNotification({
        firebaseToken: driverSearch.firebaseToken,
        title: "You have a new order request, Hurry up !",
        body: `Order #${orderSearch.master.orderId} was canceled by board`,
        type: "2",
        deviceType: +driverSearch.deviceType, // + To Number
      });

      /******************************************************/
      //Send the cancel to the driver via socket
      io.to(drivers.get(parseInt(orderSearch.master.driverId))).emit(
        "CancelOrder",
        {
          status: true,
          isAuthorize: true,
          message: `Order #${orderId} was canceled by board`,
          orderId,
        }
      );
    }
    /******************************************************/

    return res.json({
      status: true,
      message: `Order #${orderId} has been canceled successfully`,
    });

    /******************************************************/
  } catch (e) {
    if (!res.headersSent) {
      return res.json({
        status: false,
        message: `Error in CancelOrder endpoint: ${e.message}`,
      });
    }
    console.log(`Error in CancelOrder endpoint: ${e.message}`, e);
  }
});

module.exports = router;
