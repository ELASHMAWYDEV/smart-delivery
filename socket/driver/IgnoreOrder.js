const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");
const orderCycle = require("../../helpers/orderCycle");
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const {
  activeOrders,
  drivers,
  busyDrivers,
  orderCycleDrivers,
} = require("../../globals");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
  socket.on("IgnoreOrder", async ({ orderId, driverId, token }) => {
    /*
     * Start the Event Locker from here
     */

    if (!EventLocks.has(orderId)) EventLocks.set(orderId, new Mutex());

    const releaseEvent = await EventLocks.get(orderId).acquire();
    /******************************************************/

    try {
      console.log(
        `IgnoreOrder event was called by driver: ${driverId}, order: ${orderId}`
      );

      //Developement errors
      if (!orderId)
        return socket.emit("IgnoreOrder", {
          status: false,
          message: "orderId is missing",
        });
      if (!driverId)
        return socket.emit("IgnoreOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("IgnoreOrder", {
          status: false,
          message: "token is missing",
        });

      /********************************************************/

      driverId = parseInt(driverId);
      /********************************************************/
      //Check if token is valid
      let driverSearch = await DriverModel.findOne({
        driverId,
        accessToken: token,
      });

      if (!driverSearch) {
        return socket.emit("IgnoreOrder", {
          status: false,
          isAuthorize: false,
          message: "You are not authorized",
          orderId,
        });
      }

      /******************************************************/
      //Check if the order is in the activeOrders or not
      if (!activeOrders.has(orderId)) {
        return socket.emit("IgnoreOrder", {
          status: false,
          isAuthorize: true,
          message: "The order is not available any more",
          orderId,
        });
      }

      //Add driver to socket
      drivers.set(parseInt(driverId), socket.id);

      /******************************************************/

      //Check if order exist on DB
      let orderSearch = await OrderModel.findOne({
        "master.orderId": orderId,
        "master.driverId": { $ne: driverId },
        "master.statusId": { $ne: 1 },
        driversFound: {
          $elemMatch: {
            driverId,
            requestStatus: 1,
          },
        },
      });

      if (orderSearch)
        return socket.emit("IgnoreOrder", {
          status: false,
          isAuthorize: true,
          message: `You may have accepted this order #${orderId} or the board may have canceled it`,
        });

      /******************************************************/
      //Update the driver requestStatus to 3
      await OrderModel.updateOne(
        {
          "master.orderId": orderId,
          driversFound: {
            $elemMatch: { driverId, requestStatus: { $ne: 1 } },
          },
        },
        {
          $set: {
            "master.driverId": null,
            "driversFound.$.requestStatus": 3, //Ignore
            "driversFound.$.actionDate": new Date().constructor({
              timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
            }),
          },
        }
      );

      /******************************************************/
      //Check if driver has any busy orders
      const busyOrders = await OrderModel.find({
        "master.statusId": { $in: [1, 3, 4] },
        "master.driverId": driverId,
      });

      /******************************************************/
      //Update in memory first
      busyDrivers.set(driverId, {
        busyOrders: busyOrders.map((order) => order.master.orderId),
        branchId: busyOrders.length > 0 ? busyOrders[0].master.branchId : null,
      });
      /******************************************************/
      //Set the driver to be not busy
      await DriverModel.updateOne(
        {
          driverId,
        },
        {
          isBusy: busyOrders.length > 0 ? true : false,
        }
      );

      //Send to the driver all is OK
      socket.emit("IgnoreOrder", {
        status: true,
        isAuthorize: true,
        message: `Order #${orderId} ignored successfully`,
        orderId,
      });

      /***********************************************************/

      //Clear last timeout of the order if exist
      let { timeoutFunction } = activeOrders.get(orderId) || {};

      if (timeoutFunction) {
        clearTimeout(timeoutFunction);
      }

      /***********************************************************/
      //Add to memory
      orderCycleDrivers.set(orderId, [
        ...new Set([...(orderCycleDrivers.get(orderId) || []), driverId]),
      ]);
      console.log("Started cycle from IgnoreOrder, order", orderId);
      //Send the order to the next driver
      orderCycle({ orderId, driverIdSentFrom: driverId });

      /******************************************************/
    } catch (e) {
      Sentry.captureException(e);

      console.log(`Error in IgnoreOrder event: ${e.message}`, e);
      return socket.emit("IgnoreOrder", {
        status: false,
        message: `Error in IgnoreOrder event: ${e.message}`,
        orderId,
      });
    } finally {
      releaseEvent(); //Stop event locker
    }
  });
};
