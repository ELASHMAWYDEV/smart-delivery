const { v4: uuidv4 } = require("uuid");

//Models
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");

//Globals
let { drivers, disconnectInterval } = require("../../globals");

//Helpers
// const checkForTripRequest = require("../../helpers/Join/checkForTripRequest");

module.exports = (io, socket) => {
  socket.on(
    "GoOnline",
    async ({ driverId, status, token, firebaseToken, deviceType = 1 }) => {
      try {
        console.log(
          `GoOnline Event Called, driver id: ${driverId}, ${
            status == 1 ? "online" : "offline"
          }`
        );

        driverId = parseInt(driverId);
        /********************************************************/

        //Check if token is valid
        let driverSearch = await DriverModel.findOne({
          driverId,
          accessToken: token,
        });

        if (!driverSearch) {
          return socket.emit("GoOnline", {
            status: false,
            isAuthorize: false,
            isOnline: false,
            message: "You are not authorized",
          });
        }

        /******************************************************/
        //Add driver to socket
        drivers.set(driverId, socket.id);
        //Remove from the disconnect interval
        disconnectInterval.delete(driverId);

        //Update the driver
        await DriverModel.updateOne(
          { driverId },
          {
            $set: {
              isOnline: status == 1 ? true : false,
              deviceType,
              firebaseToken,
            },
          }
        );

        console.log(drivers);

        /***************************************************/
        //Search for busy orders
        let busyOrders = await OrderModel.find({
          "master.statusId": { $in: [3, 4] },
          "master.driverId": driverId,
        });

        let isHasOrder = false;
        if (busyOrders.length > 0) isHasOrder = true;

        busyOrders = await OrderModel.find({
          "master.statusId": { $in: [1, 3, 4] },
          "master.driverId": driverId,
        });

        busyOrders = busyOrders.map((order) => order.master.orderId);
        /***************************************************/
        //Emit GoOnline with updated status
        return socket.emit("GoOnline", {
          status: true,
          isAuthorize: true,
          isOnline: status == 1 ? true : false,
          isHasOrder,
          message: `The driver is set to ${status == 1 ? "online" : "offline"}`,
          busyOrders,
        });
        /***********************************************************/
      } catch (e) {
        console.log(`Error in GoOnline, error: ${e.message}`);
        return socket.emit("GoOnline", {
          status: false,
          message: `Error in GoOnline, error: ${e.message}`,
        });
      }
    }
  );
};
