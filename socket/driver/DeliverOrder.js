const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");
const { deliverOrder } = require("../../helpers");
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");
const { busyDrivers } = require("../../globals");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
  socket.on("DeliverOrder", async ({ lat, lng, orderId, driverId, token }) => {
    console.log(
      `DeliverOrder event was called by driver: ${driverId}, order: ${orderId}`
    );

    /****************************************************/

    try {
      //Developement errors
      if (!orderId)
        return socket.emit("DeliverOrder", {
          status: false,
          message: "branchId is missing",
        });
      if (!driverId)
        return socket.emit("DeliverOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("DeliverOrder", {
          status: false,
          message: "token is missing",
        });
      if (lat === null)
        return socket.emit("DeliverOrder", {
          status: false,
          message: "lat is missing",
        });
      if (lng === null)
        return socket.emit("DeliverOrder", {
          status: false,
          message: "lng is missing",
        });

      driverId = parseInt(driverId);
      orderId = parseInt(orderId);
      /******************************************************/

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
      /*
       * Start the Event Locker from here
       */

      if (!EventLocks.has(orderId)) EventLocks.set(orderId, new Mutex());

      const releaseEvent = await EventLocks.get(orderId).acquire();
      /******************************************************/

      try {
        //Update the orders
        const updateOrdersResult = await deliverOrder({
          token,
          orderId,
          lat,
          lng,
        });

        if (!updateOrdersResult.status) {
          return socket.emit("DeliverOrder", updateOrdersResult);
        }

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
          branchId:
            busyOrders.length > 0 ? busyOrders[0].master.branchId : null,
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

        /******************************************************/

        socket.emit("DeliverOrder", {
          status: true,
          isAuthorize: true,
          message: `Order #${orderId} has been delivered successfully`,
        });

        /***************************************************/
      } finally {
        releaseEvent(); //Stop event locker
      }
    } catch (e) {
      Sentry.captureException(e);

      console.log(`Error in DeliverOrder event: ${e.message}`, e);
      return socket.emit("DeliverOrder", {
        status: false,
        message: `Error in DeliverOrder event: ${e.message}`,
      });
    }
  });
};
