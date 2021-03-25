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

module.exports = (io, socket) => {
  socket.on("AcceptOrder", async ({ orderId, driverId, token }) => {
    try {
      //Developement errors
      if (!orderId)
        return socket.emit("AcceptOrder", {
          status: false,
          message: "orderId is missing",
        });
      if (!driverId)
        return socket.emit("AcceptOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("AcceptOrder", {
          status: false,
          message: "token is missing",
        });

      /******************************************************/
      //Check if order exist on DB
      let orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

      if (!orderSearch)
        return socket.emit("IgnoreOrder", {
          status: false,
          message: "لا يوجد طلب بهذا الرقم",
        });

      /******************************************************/
      //Update the driver requestStatus to 2
      await OrderModel.updateOne(
        {
          "master.orderId": orderId,
          driversFound: {
            $elemMatch: { driverId, requestStatus: { $ne: 1 } },
          },
        },
        {
          $set: {
            "driversFound.$.requestStatus": 2, //reject
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
        orderId: orderId,
      });

      //Send request to driversOnWay
      if (driversOnWay.status) {
        let { drivers } = driversOnWay;
        const result = await sendRequestToDriver({
          driver: drivers[0],
          orderId: orderSearch.master.orderId,
        });

        if (result.status) {
          //Respond to driver
          return socket.emit("IgnoreOrder", {
            status: true,
            message: "order rejected successfully",
          });
        }
      }

      /******************************************************/

      //Find nearest driver & send request to him
      let nearestDriverResult = await findNearestDriver({
        location: orderSearch.master.receiverLocation,
        orderId: orderSearch.master.orderId,
      });

      if (nearestDriverResult.status) {
        const result = await sendRequestToDriver({
          driver: nearestDriverResult.driver.driverId,
          orderId: orderSearch.master.orderId,
        });

        if (result.status) {
          //Respond to driver
          return socket.emit("IgnoreOrder", {
            status: true,
            message: "order ignored successfully",
          });
        }
      }

      /******************************************************/
      const updateResult = await updateOrderStatus({
        statusId: 2,
        orderId: orderSearch.master.orderId,
        token: req.token,
      });

      if (!updateResult.status) {
        console.log(updateResult);
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

      return socket.emit("IgnoreOrder", {
        status: true,
        message: "order ignored successfully",
      });
    } catch (e) {
      console.log(DriverModel);
      return socket.emit("IgnoreOrder", {
        status: false,
        message: `Error in RejectOrder event: ${e.message}`,
      });
    }
  });
};

module.exports = router;
