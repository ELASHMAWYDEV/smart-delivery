const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const { updateOrderStatus } = require("../../helpers");
const { activeOrders, drivers } = require("../../globals");
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const { io } = require("../../index");

router.post("/", async (req, res) => {
  try {
    //Developement errors
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.json({ status: false, errors: errors.array() });
    /******************************************************/

    const { orderId, driverId } = req.body;

    //Check if order exist on DB
    let orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    if (!orderSearch)
      return res.json({ status: false, message: "لا يوجد طلب بهذا الرقم" });

    /******************************************************/
    //Check if order wasn't accepted by another driver
    //Check memory first for fast seacrch
    if (activeOrders.has(orderId))
      return res.json({
        status: false,
        message: "عذرا ، قام سائق أخر بقبول الطلب",
      });

    //Check DB after that
    orderSearch = await OrderModel.findOne({
      "master.orderId": orderId,
      "master.statusId": { $ne: 1 }, //Not Equal,
      "master.driverId": { $ne: driverId },
      driversFound: {
        $elemMatch: { requestStatus: { $in: [2, 3, 4, 5] } },
      },
    });

    //If another driver accepted the order
    if (orderSearch)
      return res.json({
        status: false,
        message: "عذرا ، قام سائق أخر بقبول الطلب",
      });

    /******************************************************/

    //Save the driver to the active orders

    activeOrders.set(orderId, driverId);
    /******************************************************/
    //Set this driver as the accepter of this order
    await OrderModel.updateOne(
      {
        "master.orderId": orderId,
        driversFound: {
          $elemMatch: { driverId },
        },
      },
      {
        $set: {
          "driversFound.$.requestStatus": 1, //Accept
          "driversFound.$.actionDate": new Date().constructor({
            timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
          }),
          "master.statusId": 3, //Accept
          "master.driverId": driverId,
        },
      }
    );
    /******************************************************/

    //Update the order
    const updateResult = await updateOrderStatus({
      token: req.token,
      orderId,
      statusId: 3,
    });

    if (!updateResult.status) {
      activeOrders.delete(orderId);
      return res.json(updateResult);
    }
    /******************************************************/
    //Save the driver data coming from trip
    // await OrderModel.updateOne(
    //   {
    //     "master.orderId": orderId,
    //     driversFound: {
    //       $elemMatch: { driverId },
    //     },
    //   },
    //   {
    //     $set: {
    //       driverName: updateResult.data.driverName,
    //       colorHex: updateResult.data.colorHex,
    //       driverPicture: updateResult.data.driverPicture,
    //       totalDriverEvaluate: updateResult.data.totalDriverEvaluate,
    //       taxiNumber: updateResult.data.taxiNumber,
    //       model: updateResult.data.model,
    //       carPicture: updateResult.data.carPicture,
    //     },
    //   }
    // );

    /******************************************************/
    //Get the order again
    orderSearch = await OrderModel.findOne({ "master.orderId": orderId });
    orderSearch = orderSearch && orderSearch.toObject();
    /******************************************************/

    //Emit to other drivers that this driver accepted the trip
    //Drivers on the same range only

    for (let driver of orderSearch.driversFound) {
      if (driver.driverId != driverId && driver.requestStatus == 4) {
        io.to(drivers.get(driver.driverId)).emit("AcceptTrip", {
          status: false,
          message: "عذرا لقد قام سائق أخر بقبول الطلب",
        });

        //If the driver is on socket set isSeenNoCatch
      }
    }
    /******************************************************/

    //Make sure driver is busy
    await DriverModel.updateOne(
      {
        driverId,
      },
      {
        isBusy: true,
      }
    );

    /***************************************************/
    return res.json({
      status: true,
      message: "Order accepted successfully",
      order: orderSearch,
    });
    /******************************************************/
  } catch (e) {
    return res.json({
      status: false,
      message: `Error in AcceptOrder endpoint: ${e.message}`,
    });
  }
});

module.exports = router;
