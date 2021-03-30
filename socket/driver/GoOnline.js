const Sentry = require("@sentry/node");

//Models
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");

//Globals
let { drivers } = require("../../globals");

//Helpers
// const checkForTripRequest = require("../../helpers/Join/checkForTripRequest");

module.exports = (io, socket) => {
  socket.on("GoOnline", async ({ driverId, status, token }) => {
    try {
      console.log(`GoOnline Event Called, driver id: ${driverId}`);
      /********************************************************/

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

      //Add driver to socket
      drivers.set(parseInt(driverId), socket.id);

      //Update the driver
      await DriverModel.updateOne(
        { driverId },
        {
          $set: {
            isOnline: status == 1 ? true : false,
          },
        }
      );

      console.log(drivers);
      /***************************************************/
      //Search for busy orders
      let busyOrders = await OrderModel.find({
        "master.driverId": driverId,
        "master.statusId": { $nin: [2, 6] },
      });

      busyOrders = busyOrders.map((order) => order.master.orderId);
      /***************************************************/

      //Emit GoOnline with updated status
      socket.emit("GoOnline", {
        status: true,
        isAuthorize: true,
        message: `The driver is set to ${status == 1 ? "online" : "offline"}`,
        busyOrders,
      });
      /***********************************************************/
    } catch (e) {
      Sentry.captureException(e);
      console.log(`Error in GoOnline, error: ${e.message}`);
      socket.emit("GoOnline", {
        status: false,
        message: `Error in GoOnline, error: ${e.message}`,
      });
    }
  });
};
