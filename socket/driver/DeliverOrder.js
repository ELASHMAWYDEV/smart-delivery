const { deliverOrder } = require("../../helpers");

module.exports = (io, socket) => {
  socket.on("DeliverOrder", async ({ branchId, driverId, token }) => {
    try {
      //Developement errors
      if (!branchId)
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
      const updateOrdersResult = await deliverOrder({ token, branchId });

      if (!updateOrdersResult.status) {
        return socket.emit(updateOrdersResult);
      }

      let { ordersIds } = updateOrdersResult;

      return socket.emit("DeliverOrder", {
        status: true,
        message: `Orders ${ordersIds.map(
          (order) => "#" + order
        )} has been received successfully`,
      });
      /******************************************************/
    } catch (e) {
      console.log(`Error in DeliverOrder event: ${e.message}`);
      return socket.emit("DeliverOrder", {
        status: false,
        message: `Error in DeliverOrder event: ${e.message}`,
      });
    }
  });
};
