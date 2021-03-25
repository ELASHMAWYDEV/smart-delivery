const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const {
  checkDriversOnWay,
  sendRequestToDriver,
  findNearestDriver,
  updateOrderStatus,
} = require("../../helpers");
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const { io } = require("../../index");
const { clients } = require("../../globals");

router.post("/", async (req, res) => {
  try {
    //Developement errors
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.json({ status: false, errors: errors.array() });

    /******************************************************/
    const { orderId, driverId } = req.body;
    /******************************************************/
    //Check if order exist on DB
    let orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    if (!orderSearch)
      return res.json({ status: false, message: "لا يوجد طلب بهذا الرقم" });

    /******************************************************/
    //Update the driver requestStatus to 3
    await OrderModel.updateOne(
      {
        "master.orderId": orderId,
        driversFound: {
          $elemMatch: { driverId, requestStatus: { $ne: 1 } },
        },
      },
      {
        $set: {
          "driversFound.$.requestStatus": 3,
          "driversFound.$.actionDate": new Date().constructor({
            timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
          }),
        },
      }
    );
    /******************************************************/

    //Remove the orderId from busyOrders
    await DriverModel.updateOne(
      {
        driverId,
      },
      {
        $pull: { busyOrders: { orderId } },
      }
    );

    //Check if driver has any busy orders
    let driverSearch = await DriverModel.findOne({ driverId });

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

    //Check if any driver on the way to this restaurant
    let driversOnWay = await checkDriversOnWay({
      branchId: orderSearch.master.branchId,
    });

    //Send request to driversOnWay
    if (driversOnWay.status) {
      let { drivers } = driversOnWay;
      const result = await sendRequestToDriver({
        driver: drivers[0],
        orderId: orderSearch.master.orderId,
      });

      //Send the result to client
      return res.json(result);
    }

    /******************************************************/

    //Find nearest driver & send request to him
    let nearestDriverResult = await findNearestDriver({
      location: orderSearch.master.receiverLocation,
      orderId: orderSearch.master.orderId,
    });

    if (!nearestDriverResult.status) {
      const updateResult = await updateOrderStatus({
        statusId: 2,
        orderId: orderSearch.master.orderId,
        token: req.token,
      });

      if (!updateResult.status) {
        return res.json(updateResult);
      }

      //Update the order
      await OrderModel.updateOne(
        {
          "master.orderId": orderId,
        },
        {
          $set: {
            "master.statusId": 2, //Not found
            "master.driverId": null,
          },
        }
      );

      //Send to the client
      io.to(clients.get(orderSearch.master.branchId)).emit("NoDriversFound", {
        status: true,
        message: `No drivers found for order #${orderSearch.master.orderId}`,
        orderSearch,
      });
      return res.json({ status: true, message: "Order ignored successfully" });
    }

    /******************************************************/

    //Send the request to driver
    const sendRequestResult = await sendRequestToDriver({
      driver: nearestDriverResult.driver,
      orderId: orderSearch.master.orderId,
    });

    /******************************************************/

    return res.json({ status: true, message: "Order ignored successfully" });
  } catch (e) {
    return res.json({
      status: false,
      message: `Error in NewOrderRequest endpoint: ${e.message}`,
    });
  }
});

module.exports = router;
