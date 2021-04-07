const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");
const { receiveOrder } = require("../../helpers");
const DriverModel = require("../../models/Driver");
const { activeOrders } = require("../../globals");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
  socket.on("ReceiveOrder", async ({ branchId, driverId, token }) => {
    /*
     * Start the Event Locker from here
     */

    if (!EventLocks.has(branchId)) EventLocks.set(branchId, new Mutex());

    const releaseEvent = await EventLocks.get(branchId).acquire();

    /******************************************************/
    try {
      console.log(
        `ReceiveOrder event was called by driver: ${driverId}, branch: ${branchId}`
      );
      /********************************************************/
      //Developement errors
      if (!branchId)
        return socket.emit("ReceiveOrder", {
          status: false,
          message: "branchId is missing",
        });
      if (!driverId)
        return socket.emit("ReceiveOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("ReceiveOrder", {
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
        return socket.emit("ReceiveOrder", {
          status: false,
          isAuthorize: false,
          isOnline: false,
          message: "You are not authorized",
        });
      }

      /******************************************************/

      //Update the orders
      const updateOrdersResult = await receiveOrder({ token, branchId });

      if (!updateOrdersResult.status) {
        return socket.emit("ReceiveOrder", updateOrdersResult);
      }

      let { ordersIds } = updateOrdersResult;

      /******************************************************/

      //Make sure driver is busy
      await DriverModel.updateOne(
        {
          driverId,
        },
        {
          isBusy: true,
        }
      );

      /******************************************************/
      //Remove the orders from activeOrders --> rubbish
      ordersIds.forEach((id) => activeOrders.delete(id));
      /******************************************************/

      socket.emit("ReceiveOrder", {
        status: true,
        isAuthorize: true,
        message: `Orders ${ordersIds.map(
          (order) => "#" + order
        )} have been received successfully`,
      });

      /***************************************************/
    } catch (e) {
      Sentry.captureException(e);

      console.log(`Error in ReceiveOrder event: ${e.message}`, e);
      return socket.emit("ReceiveOrder", {
        status: false,
        message: `Error in ReceiveOrder event: ${e.message}`,
      });
    } finally {
      releaseEvent(); //Stop event locker
    }
  });
};
