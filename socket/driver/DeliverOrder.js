const { deliverOrder } = require("../../helpers");
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");

module.exports = (io, socket) => {
  socket.on("DeliverOrder", async ({ lat, lng, orderId, driverId, token }) => {
    try {
      //Developement errors
      if (!orderId)
        return socket.emit("DeliverOrder", {
          status: false,
          message: "branchId is missing",
        });
      if (!driverId)
        return socket.emit("DeliverOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("DeliverOrder", {
          status: false,
          message: "token is missing",
        });
      if (lat === null)
        return socket.emit("DeliverOrder", {
          status: false,
          message: "lat is missing",
        });
      if (lng === null)
        return socket.emit("DeliverOrder", {
          status: false,
          message: "lng is missing",
        });

      driverId = parseInt(driverId);
      orderId = parseInt(orderId);
      /******************************************************/

      //Check if token is valid
      let driverSearch = await DriverModel.findOne({
        driverId,
        accessToken: token,
      });

      if (!driverSearch) {
        return socket.emit("AcceptOrder", {
          status: false,
          isAuthorize: false,
          isOnline: false,
          message: "You are not authorized",
        });
      }

      /******************************************************/

      console.log(
        `DeliverOrder event was called by driver: ${driverId}, order: ${orderId}`
      );
      //Update the orders
      const updateOrdersResult = await deliverOrder({
        token,
        orderId,
        lat,
        lng,
      });

      if (!updateOrdersResult.status) {
        return socket.emit("DeliverOrder", updateOrdersResult);
      }

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

      return socket.emit("DeliverOrder", {
        status: true,
        isAuthorize: true,
        message: `Order #${orderId} has been delivered successfully`,
      });
      /******************************************************/
    } catch (e) {
      console.log(`Error in DeliverOrder event: ${e.message}`, e);
      return socket.emit("DeliverOrder", {
        status: false,
        message: `Error in DeliverOrder event: ${e.message}`,
      });
    }
  });
};
