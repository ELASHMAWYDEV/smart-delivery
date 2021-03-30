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
      //Get the driver
      const driverSearch = await DriverModel.findOne({ driverId });

      if (!driverSearch) {
        return socket.emit("GoOnline", {
          status: false,
          message: `Driver ${driverId} is not registered on DB`,
        });
      }

      console.log(`GoOnline Event Called, driver id: ${driverId}`);

      //Add driver to socket
      if (status == 1) drivers.set(parseInt(driverId), socket.id);
      else drivers.delete(driverId);

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

      //Emit GoOnline with updated status
      socket.emit("GoOnline", {
        status: true,
        message: `The driver is set to ${status == 1 ? "online" : "offline"}`,
        busyOrders: driverSearch.busyOrders,
      });

      /***********************************************************/

      //Special Case if the driver was waiting for a new trip request
      // await checkForTripRequest({ socket, driverId });

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
