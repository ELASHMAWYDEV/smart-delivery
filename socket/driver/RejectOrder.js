const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");
const orderCycle = require("../../helpers/orderCycle");
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const { activeOrders, busyDrivers, drivers, driverHasTakenAction } = require("../../globals");
const LANG = require("../../util/translation");
const { checkDriverCouldBeSuspended } = require("../../helpers");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
  socket.on("RejectOrder", async ({ orderId, driverId, token, language }) => {
    /*
     * Start the Event Locker from here
     */

    if (!EventLocks.has(orderId)) EventLocks.set(orderId, new Mutex());

    const releaseEvent = await EventLocks.get(orderId).acquire();
    /******************************************************/

    try {
      console.log(`RejectOrder event was called by driver: ${driverId}, order: ${orderId}`);
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

      driverId = parseInt(driverId);
      orderId = parseInt(orderId);

      //Check if driver has taken any action before
      if (driverHasTakenAction.has(orderId)) {
        let drivers = driverHasTakenAction.get(orderId);

        if (drivers.find((driver) => driver.driverId == driverId && driver.tookAction)) {
          return socket.emit("RejectOrder", {
            status: false,
            isAuthorize: false,
            isOnline: false,
            message: LANG(language).ALREADY_TAKEN_ACTION,
          });
        }
      }

      driverHasTakenAction.set(orderId, [
        ...(driverHasTakenAction.get(orderId) || []),
        {
          driverId,
          tookAction: true,
        },
      ]);

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
          message: LANG(language).NOT_AUTHORIZED,
          orderId,
        });
      }

      /******************************************************/

      //Check if the order is in the activeOrders or not
      if (!activeOrders.has(orderId)) {
        return socket.emit("RejectOrder", {
          status: false,
          isAuthorize: true,
          message: LANG(language).ORDER_NOT_AVAILABLE_ANYMORE,
          orderId,
        });
      }

      //Add driver to socket
      drivers.set(parseInt(driverId), socket.id);

      /******************************************************/
      //Check if order exist on DB
      let orderSearch = await OrderModel.findOne({
        "master.orderId": orderId,
        "master.statusId": 1,
        driversFound: {
          $elemMatch: {
            driverId,
            requestStatus: { $ne: 4 },
          },
        },
      });

      if (orderSearch)
        return socket.emit("RejectOrder", {
          status: false,
          isAuthorize: true,
          message: LANG(language).ORDER_REJECTED_CANCELLED({ orderId }),
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
          isBusy: busyOrders.length >= 1 ? true : false,
        }
      );

      //Send to the driver all is OK
      socket.emit("RejectOrder", {
        status: true,
        isAuthorize: true,
        message: LANG(language).ORDER_REJECTED,
        orderId,
      });

      /***********************************************************/
      //Clear last timeout of the order if exist
      let { timeoutFunction } = activeOrders.get(orderId) || {};

      if (timeoutFunction) {
        clearTimeout(timeoutFunction);
      }

      /**********************************************************/
      console.log("Started cycle from RejectOrder, order", orderId);

      //Get driversIds & orderDirversLimit
      let { driversIds, orderDriversLimit } = activeOrders.get(orderId) || {
        driversIds: [],
        orderDriversLimit: 2,
      };

      //Send the order to the next driver
      orderCycle({
        orderId,
        driverIdSentFrom: driverId,
        driversIds,
        orderDriversLimit,
      });
      /***************************************************/

      // Check if the driver could be suspended or not
      checkDriverCouldBeSuspended({ driverId });

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
