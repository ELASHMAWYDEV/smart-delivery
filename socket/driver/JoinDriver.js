const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");

//Models
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");

//Globals
let { drivers, disconnectInterval, busyDrivers } = require("../../globals");

//Helpers
const { checkForOrderRequest } = require("../../helpers");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
  socket.on(
    "JoinDriver",
    async ({ driverId, token, firebaseToken, deviceType = 2 }) => {
      /*
       * Start the Event Locker from here
       */

      if (!EventLocks.has(driverId)) EventLocks.set(driverId, new Mutex());

      const releaseEvent = await EventLocks.get(driverId).acquire();

      /********************************************************/
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

        //Add driver to the socket
        drivers.set(driverId, socket.id);
        //Remove from the disconnect interval
        disconnectInterval.delete(driverId);

        /********************************************************/
        //Search for busy orders
        let isHasOrder = false;
        let busyOrders = await OrderModel.find({
          "master.statusId": { $in: [1, 3, 4] },
          "master.driverId": driverId,
        });

        /******************************************************/
        //Update in memory first
        busyDrivers.set(driverId, {
          busyOrders: busyOrders.map((order) => order.master.orderId),
          branchId:
            busyOrders.length > 0 ? busyOrders[0].master.branchId : null,
        });

        /******************************************************/

        let busyActiveOrders = busyOrders.filter((order) =>
          [3, 4].includes(order.master.statusId)
        );

        let busyCreatedOrders = busyOrders.filter(
          (order) => order.master.statusId == 1
        );

        if (busyActiveOrders.length != 0) {
          isHasOrder = true;
        }

        if (busyCreatedOrders.length != 0) {
          isHasOrder = false;
        }

        busyOrders = busyOrders.map((order) => order.master.orderId);

        //If isHasOrder true --> force him Online if he was offline

        let { busyOrders: busyOrdersMemory } = busyDrivers.get(+driverId) || {
          busyOrders: [],
        };

        if (isHasOrder || busyOrdersMemory.length != 0) {
          await DriverModel.updateOne(
            { driverId },
            { isOnline: true, firebaseToken, deviceType }
          );
        } else {
          await DriverModel.updateOne(
            { driverId },
            { firebaseToken, deviceType }
          );
        }

        /********************************************************/

        //Send back to the driver
        socket.emit("JoinDriver", {
          status: true,
          isAuthorize: true,
          isOnline:
            driverSearch.isOnline || isHasOrder || busyOrdersMemory.length != 0,
          isHasOrder,
          message: `join success, socket id: ${socket.id}`,
          busyOrders,
        });

        /********************************************************/

        if (busyCreatedOrders.length != 0) {
          await checkForOrderRequest({ socket, driverId }); //Send him orders that he have not seen
        }
        /***************************************************/
      } catch (e) {
        Sentry.captureException(e);

        console.log(`Error in JoinDriver, error: ${e.message}`);
        socket.emit("JoinDriver", {
          status: false,
          message: `Error in JoinDriver, error: ${e.message}`,
        });
      } finally {
        releaseEvent(); //Stop event locker
      }
    }
  );
};
