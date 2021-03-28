const express = require("express");
const router = express.Router();
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const { io } = require("../../index");
const { drivers } = require("../../globals");

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

    //Remove the order from driver's busyOrders & make not busy if no orders left
    await DriverModel.updateOne(
      {
        driverId: orderSearch.master.driverId,
      },
      {
        $pull: { busyOrders: { orderId } },
      }
    );

    //Check if driver has any busy orders
    let driversSearch = await DriverModel.find({
      driverId: orderSearch.master.driverId,
    });

    if (!(driversSearch.busyOrders && driversSearch.busyOrders.length != 0)) {
      //Set the driver to be not busy
      await DriverModel.updateOne(
        {
          driverId: driversSearch.driverId,
        },
        {
          isBusy: false,
        }
      );
    }

    /******************************************************/
    //Send the cancel to the driver via socket
    io.to(drivers.get(orderSearch.master.driverId)).emit("CancelOrder", {
      status: true,
      message: `Order #${orderId} was canceled by board`,
      orderId,
    });

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
