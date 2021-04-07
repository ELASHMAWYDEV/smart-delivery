const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");

//Models
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");

//Globals
let { drivers, disconnectInterval } = require("../../globals");

//Helpers
const { checkForOrderRequest } = require("../../helpers");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
  socket.on(
    "GoOnline",
    async ({ driverId, status, token, firebaseToken, deviceType = 2 }) => {
      /*
       * Start the Event Locker from here
       */

      if (!EventLocks.has(driverId)) EventLocks.set(driverId, new Mutex());

      const releaseEvent = await EventLocks.get(driverId).acquire();

      /***************************************************/

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

        console.log(drivers);

        /******************************************************/

        //Search for busy orders
        let busyOrders = await OrderModel.find({
          "master.statusId": { $in: [1, 3, 4] },
          "master.driverId": driverId,
        });

        let busyActiveOrders = busyOrders.filter((order) =>
          [3, 4].includes(order.master.statusId)
        );

        let busyCreatedOrders = busyOrders.filter(
          (order) => order.master.statusId == 1
        );

        if (busyCreatedOrders.length != 0) {
          await checkForOrderRequest({ socket, driverId });
        }

        busyOrders = busyOrders.map((order) => order.master.orderId);

        /***************************************************/

        let isOnline = status == 1 ? true : false;
        if (busyActiveOrders.length > 0 && status == 1) isOnline = true;
        if (busyActiveOrders.length > 0 && status == 2) isOnline = true;
        if (busyActiveOrders.length == 0 && status == 1) isOnline = true;
        if (busyActiveOrders.length == 0 && status == 2) isOnline = false;

        //Update the driver
        await DriverModel.updateOne(
          { driverId },
          {
            $set: {
              isOnline,
              isBusy: busyOrders.length > 0 ? true : false,
              deviceType,
              firebaseToken,
            },
          }
        );
        /***************************************************/
        //Emit GoOnline with updated status
        socket.emit("GoOnline", {
          status: true,
          isAuthorize: true,
          isOnline,
          isHasOrder:
            busyActiveOrders.length > 0 && busyCreatedOrders.length == 0
              ? true
              : false,
          message: `The driver is set to ${isOnline ? "online" : "offline"}`,
          busyOrders,
        });

        /***************************************************/
      } catch (e) {
        Sentry.captureException(e);

        console.log(`Error in GoOnline, error: ${e.message}`);
        return socket.emit("GoOnline", {
          status: false,
          message: `Error in GoOnline, error: ${e.message}`,
        });
      } finally {
        releaseEvent(); //Stop event locker
      }
    }
  );
};
