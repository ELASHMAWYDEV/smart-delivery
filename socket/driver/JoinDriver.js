const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");

//Models
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");

//Globals
let { drivers, disconnectInterval } = require("../../globals");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

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

      /******************************************************/
      /*
       * Start the Event Locker from here
       */

      if (!EventLocks.has(driverId)) EventLocks.set(driverId, new Mutex());

      const releaseEvent = await EventLocks.get(driverId).acquire();

      /********************************************************/

      try {
        //Check for busy orders
        let busyOrders = await OrderModel.countDocuments({
          "master.statusId": { $in: [3, 4] },
          "master.driverId": driverId,
        });

        let isHasOrder = false;
        if (busyOrders > 0) isHasOrder = true;

        /********************************************************/
        //Add driver to the socket
        drivers.set(driverId, socket.id);
        //Remove from the disconnect interval
        disconnectInterval.delete(driverId);

        /********************************************************/
        //Send back to the driver
        socket.emit("JoinDriver", {
          status: true,
          isAuthorize: true,
          isHasOrder,
          isOnline: isHasOrder || driverSearch.isOnline,
          message: `join success, socket id: ${socket.id}`,
        });

        /***************************************************/
      } finally {
        releaseEvent(); //Stop event locker
      }
    } catch (e) {
      Sentry.captureException(e);

      console.log(`Error in JoinDriver, error: ${e.message}`);
      socket.emit("JoinDriver", {
        status: false,
        message: `Error in JoinDriver, error: ${e.message}`,
      });
    }
  });
};
