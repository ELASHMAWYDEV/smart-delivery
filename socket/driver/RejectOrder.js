const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");
const orderCycle = require("../../helpers/orderCycle");
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const { ordersInterval } = require("../../globals");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
  socket.on("RejectOrder", async ({ orderId, driverId, token }) => {
    /*
     * Start the Event Locker from here
     */

    if (!EventLocks.has(orderId)) EventLocks.set(orderId, new Mutex());

    const releaseEvent = await EventLocks.get(orderId).acquire();
    /******************************************************/

    try {
      console.log(
        `RejectOrder event was called by driver: ${driverId}, order: ${orderId}`
      );
      /********************************************************/
      //Developement errors
      if (!orderId)
        return socket.emit("RejectOrder", {
          status: false,
          message: "orderId is missing",
        });
      if (!driverId)
        return socket.emit("RejectOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("RejectOrder", {
          status: false,
          message: "token is missing",
        });

      /********************************************************/

      //Check if token is valid
      let driverSearch = await DriverModel.findOne({
        driverId,
        accessToken: token,
      });

      if (!driverSearch) {
        return socket.emit("RejectOrder", {
          status: false,
          isAuthorize: false,
          message: "You are not authorized",
          orderId,
        });
      }

      /******************************************************/

      //Check if order exist on DB
      let orderSearch = await OrderModel.findOne({
        "master.orderId": orderId,
        "master.driverId": { $ne: driverId },
        "master.statusId": { $ne: 1 },
      });

      if (orderSearch)
        return socket.emit("RejectOrder", {
          status: false,
          isAuthorize: true,
          message: `You may have accepted this order #${orderId} or the board may have canceled it`,
          orderId,
        });

      /******************************************************/
      //Update the driver requestStatus to 2
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
            "driversFound.$.requestStatus": 2, //reject
            "driversFound.$.actionDate": new Date().constructor({
              timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
            }),
          },
        }
      );
      /******************************************************/
      //Check if driver has any busy orders
      const busyOrders = await OrderModel.countDocuments({
        "master.statusId": { $in: [1, 3, 4] },
        "master.driverId": driverId,
      });

      //Set the driver to be not busy
      await DriverModel.updateOne(
        {
          driverId,
        },
        {
          isBusy: busyOrders >= 1 ? true : false,
        }
      );

      //Send to the driver all is OK
      socket.emit("RejectOrder", {
        status: true,
        isAuthorize: true,
        message: `Order #${orderId} rejected successfully`,
        orderId,
      });

      /***********************************************************/
      //Clear last timeout of the order if exist
      let { timeoutFunction } = ordersInterval.get(orderId) || {};

      if (timeoutFunction) {
        clearTimeout(timeoutFunction);
      }

      /***********************************************************/
      //Send the order to the next driver
      orderCycle({ orderId });

      /***************************************************/
    } catch (e) {
      Sentry.captureException(e);

      console.log(`Error in RejectOrder event: ${e.message}`, e);
      return socket.emit("RejectOrder", {
        status: false,
        message: `Error in RejectOrder event: ${e.message}`,
        orderId,
      });
    } finally {
      releaseEvent(); //Stop event locker
    }
  });
};
