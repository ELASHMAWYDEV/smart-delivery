//Models
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");

//Globals
let { drivers, disconnectInterval } = require("../../globals");

//Helpers
const { checkForOrderRequest } = require("../../helpers");

module.exports = (io, socket) => {
  socket.on("JoinDriver", async ({ driverId, token }) => {
    try {
      console.log(`JoinDriver Event Called, driver id: ${driverId}`);

      //Developement errors
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

      /********************************************************/
      //Parse driverId
      driverId = parseInt(driverId);

      /********************************************************/

      //Check if token is valid
      let driverSearch = await DriverModel.findOne({
        driverId,
        accessToken: token,
      });

      if (!driverSearch) {
        return socket.emit("JoinDriver", {
          status: false,
          isAuthorize: false,
          isOnline: false,
          message: "You are not authorized",
        });
      }

      /********************************************************/
      //Search for busy orders
      let busyOrders = await OrderModel.find({
        "master.statusId": { $in: [1, 3, 4] },
        "master.driverId": driverId,
      });

      let isHasOrder = false;

      let busyActiveOrders = busyOrders.filter((order) =>
        [3, 4].includes(order.master.statusId)
      );
      if (busyActiveOrders.length > 0) isHasOrder = true;

      let busyCreatedOrders = busyOrders.filter(
        (order) => order.master.statusId == 1
      );

      if (busyCreatedOrders.length != 0) {
        await checkForOrderRequest({ socket, driverId });
      }

      /********************************************************/
      //Add driver to the socket
      drivers.set(driverId, socket.id);
      //Remove from the disconnect interval
      disconnectInterval.delete(driverId);

      /********************************************************/
      //Send back to the driver
      return socket.emit("JoinDriver", {
        status: true,
        isAuthorize: true,
        isHasOrder,
        isOnline: isHasOrder || driverSearch.isOnline,
        message: `join success, socket id: ${socket.id}`,
      });

      /********************************************************/
    } catch (e) {
      console.log(`Error in JoinDriver, error: ${e.message}`);
      socket.emit("JoinDriver", {
        status: false,
        message: `Error in JoinDriver, error: ${e.message}`,
      });
    }
  });
};
