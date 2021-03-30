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
  socket.on("RejectOrder", async ({ orderId, driverId, token }) => {
    try {
      //Developement errors
      if (!orderId)
        return socket.emit("RejectOrder", {
          status: false,
          message: "orderId is missing",
        });
      if (!driverId)
        return socket.emit("RejectOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("RejectOrder", {
          status: false,
          message: "token is missing",
        });

      /********************************************************/

      //Check if token is valid
      let driverSearch = await DriverModel.findOne({
        driverId,
        accessToken: token,
      });

      if (!driverSearch) {
        return socket.emit("RejectOrder", {
          status: false,
          isAuthorize: false,
          message: "You are not authorized",
        });
      }
      /******************************************************/
      //Check if order exist on DB
      let orderSearch = await OrderModel.findOne({
        "master.orderId": orderId,
        "master.driverId": driverId,
        "master.statusId": { $in: [3, 4, 5, 6] },
      });

      if (orderSearch)
        return socket.emit("RejectOrder", {
          status: false,
          isAuthorize: true,
          message: `You may have accepted this order #${orderId} or the board may have canceled it`,
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
            driverId: null,
            "driversFound.$.requestStatus": 2, //reject
            "driversFound.$.actionDate": new Date().constructor({
              timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
            }),
          },
        }
      );
      /******************************************************/
      //Check if driver has any busy orders
      const busyOrders = await OrderModel.countDocuments({
        "master.statusId": { $in: [1, 3, 4, 5] },
        "master.driverId": driverId,
      });

      //Set the driver to be not busy
      await DriverModel.updateOne(
        {
          driverId,
        },
        {
          isBusy: busyOrders > 0 ? true : false,
        }
      );

      /******************************************************/
      //Send to the driver all is OK
      socket.emit("RejectOrder", {
        status: true,
        isAuthorize: true,
        message: "order rejected successfully",
      });

      /******************************************************/
      orderSearch = await OrderModel.findOne({
        "master.orderId": orderId,
      });

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

        if (result.status) return;
      }

      /******************************************************/

      //Find nearest driver & send request to him
      let nearestDriverResult = await findNearestDriver({
        location: orderSearch.master.branchLocation,
        orderId: orderSearch.master.orderId,
      });

      if (nearestDriverResult.status) {
        const result = await sendRequestToDriver({
          driver: nearestDriverResult.driver.driverId,
          orderId: orderSearch.master.orderId,
        });

        if (result.status) return;
      }

      /******************************************************/
      const updateResult = await updateOrderStatus({
        statusId: 2,
        orderId: orderSearch.master.orderId,
        token,
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
    } catch (e) {
      console.log(`Error in RejectOrder event: ${e.message}`, e);
      return socket.emit("RejectOrder", {
        status: false,
        message: `Error in RejectOrder event: ${e.message}`,
      });
    }
  });
};
