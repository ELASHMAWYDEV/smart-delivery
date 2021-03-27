const express = require("express");
const router = express.Router();
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const { io } = require("../../index");
const { drivers } = require("../../globals");

router.post("/", async (req, res) => {
  try {
    const { orderId } = req.body;

    //Developmemt Errors
    if (!orderId)
      return res.json({ status: false, message: "orderId is missing" });

    /******************************************************/
    //Search for the order
    const orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    if (!orderSearch)
      return res.json({
        status: false,
        message: `There is no order with id #${orderId}`,
      });

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
    let driverSearch = await DriverModel.findOne({
      driverId: orderSearch.master.driverId,
    });

    if (driverSearch.busyOrders.length == 0) {
      //Set the driver to be not busy
      await DriverModel.updateOne(
        {
          driverId,
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
      message: "Order has been canceled successfully",
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
