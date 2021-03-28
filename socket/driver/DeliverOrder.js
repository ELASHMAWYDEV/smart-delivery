const { deliverOrder } = require("../../helpers");
const DriverModel = require("../../models/Driver");

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
      /******************************************************/

      //Update the orders
      const updateOrdersResult = await deliverOrder({
        token,
        orderId,
        lat,
        lng,
      });

      if (!updateOrdersResult.status) {
        return socket.emit(updateOrdersResult);
      }

      //Remove the order from driver's busyOrders & make not busy if no orders left
      await DriverModel.updateOne(
        {
          driverId: driverId,
        },
        {
          $pull: { busyOrders: { orderId } },
        }
      );

      //Check if driver has any busy orders
      let driverSearch = await DriverModel.findOne({
        driverId: driverId,
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

      return socket.emit("DeliverOrder", {
        status: true,
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
