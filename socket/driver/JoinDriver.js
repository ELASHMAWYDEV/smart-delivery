//Models
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");

//Globals
let { drivers } = require("../../globals");

//Helpers
// const checkForTripRequest = require("../../helpers/Join/checkForTripRequest");

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

      //Check for busy orders
      const busyOrders = await OrderModel.countDocuments({
        "master.statusId": { $in: [1, 3, 4, 5] },
        "master.driverId": driverId,
      });

      let isHasTrip = false;
      if (busyOrders > 0) isHasTrip = true;

      /********************************************************/
      //Add driver to the socket
      drivers.set(driverId, socket.id);

      /********************************************************/
      //Send back to the driver
      socket.emit("JoinDriver", {
        status: true,
        isHasTrip,
        isAuthorize: true,
        message: `join success, socket id: ${socket.id}`,
      });

      /********************************************************/
    } catch (e) {
      console.log(`Error in GoOnline, error: ${e.message}`);
      socket.emit("GoOnline", {
        status: false,
        message: `Error in GoOnline, error: ${e.message}`,
      });
    }
  });
};
