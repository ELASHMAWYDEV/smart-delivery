const {
  checkDriverOnWay,
  sendRequestToDriver,
  findNearestDriver,
  updateOrderStatus,
} = require("../../helpers");
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const { clients, ordersInterval, drivers } = require("../../globals");

module.exports = (io, socket) => {
  socket.on("IgnoreOrder", async ({ orderId, driverId, token }) => {
    try {
      console.log(
        `IgnoreOrder event was called by driver: ${driverId}, order: ${orderId}`
      );

      //Developement errors
      if (!orderId)
        return socket.emit("IgnoreOrder", {
          status: false,
          message: "orderId is missing",
        });
      if (!driverId)
        return socket.emit("IgnoreOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("IgnoreOrder", {
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
        return socket.emit("IgnoreOrder", {
          status: false,
          isAuthorize: false,
          message: "You are not authorized",
        });
      }

      /******************************************************/
      //Check if the order is in the ordersInterval or not
      if (!ordersInterval.has(orderId)) {
        return socket.emit("IgnoreOrder", {
          status: false,
          isAuthorize: true,
          message: "The order is not available any more",
        });
      }

      //Add driver to socket
      drivers.set(parseInt(driverId), socket.id);

      /******************************************************/

      //Check if order exist on DB
      let orderSearch = await OrderModel.findOne({
        "master.orderId": orderId,
        "master.driverId": { $ne: driverId },
        "master.statusId": { $ne: 1 },
        driversFound: {
          $elemMatch: {
            driverId,
            requestStatus: 1,
          },
        },
      });

      if (orderSearch)
        return socket.emit("IgnoreOrder", {
          status: false,
          isAuthorize: true,
          message: `You may have accepted this order #${orderId} or the board may have canceled it`,
        });

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
            "master.driverId": null,
            "driversFound.$.requestStatus": 3, //Ignore
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
      orderSearch = await OrderModel.findOne({
        "master.orderId": orderId,
      });

      //Check if any driver on the way to this restaurant
      let driverOnWay = await checkDriverOnWay({
        branchId: orderSearch.master.branchId,
        orderId,
      });

      //Send request to driverOnWay
      if (driverOnWay.status) {
        let { driver } = driverOnWay;
        const result = await sendRequestToDriver({
          driver,
          orderId: orderSearch.master.orderId,
        });

        if (result.status) {
          console.log(
            `Order ${orderSearch.master.orderId} was sent to driver ${driver.driverId} on way`
          );
          return;
        }
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

        if (result.status) {
          console.log(
            `Order ${orderSearch.master.orderId} was sent to driver ${nearestDriverResult.driver.driverId}`
          );
          return;
        }
      }

      console.log(`Order ${orderSearch.master.orderId}, no drivers found`);

      const updateResult = await updateOrderStatus({
        statusId: 2,
        orderId: orderSearch.master.orderId,
        token,
      });

      if (!updateResult.status) {
        //Send to the driver all is OK
        return socket.emit("IgnoreOrder", updateResult);
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

      //Send to the driver all is OK
      return socket.emit("IgnoreOrder", {
        status: true,
        isAuthorize: true,
        message: `Order #${orderId} ignored successfully`,
      });
      /******************************************************/
    } catch (e) {
      console.log(`Error in IgnoreOrder event: ${e.message}`, e);
      return socket.emit("IgnoreOrder", {
        status: false,
        message: `Error in IgnoreOrder event: ${e.message}`,
      });
    }
  });
};
