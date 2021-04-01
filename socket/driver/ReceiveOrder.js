const { receiveOrder } = require("../../helpers");
const DriverModel = require("../../models/Driver");
const { activeOrders } = require("../../globals");

module.exports = (io, socket) => {
  socket.on("ReceiveOrder", async ({ branchId, driverId, token }) => {
    try {
      //Developement errors
      if (!branchId)
        return socket.emit("ReceiveOrder", {
          status: false,
          message: "branchId is missing",
        });
      if (!driverId)
        return socket.emit("ReceiveOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("ReceiveOrder", {
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
        return socket.emit("ReceiveOrder", {
          status: false,
          isAuthorize: false,
          isOnline: false,
          message: "You are not authorized",
        });
      }

      /******************************************************/
      console.log(
        `ReceiveOrder event was called by driver: ${driverId}, branch: ${branchId}`
      );
      //Update the orders
      const updateOrdersResult = await receiveOrder({ token, branchId });

      if (!updateOrdersResult.status) {
        return socket.emit("ReceiveOrder", updateOrdersResult);
      }

      let { ordersIds } = updateOrdersResult;

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

      /******************************************************/
      //Remove the orders from activeOrders --> rubbish
      ordersIds.forEach((id) => activeOrders.delete(id));
      /******************************************************/

      return socket.emit("ReceiveOrder", {
        status: true,
        isAuthorize: true,
        message: `Orders ${ordersIds.map(
          (order) => "#" + order
        )} have been received successfully`,
      });
      /******************************************************/
    } catch (e) {
      console.log(`Error in ReceiveOrder event: ${e.message}`, e);
      return socket.emit("ReceiveOrder", {
        status: false,
        message: `Error in ReceiveOrder event: ${e.message}`,
      });
    }
  });
};
