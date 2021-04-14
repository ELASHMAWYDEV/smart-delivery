const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");

//Models
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");
const orderCycle = require("../../helpers/orderCycle");

//Globals
let {
  drivers,
  disconnectInterval,
  activeOrders,
  busyDrivers,
  orderCycleDrivers,
} = require("../../globals");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
  socket.on("GoOnline", async ({ driverId, status, token }) => {
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
      /******************************************************/
      //Update in memory first
      busyDrivers.set(driverId, {
        busyOrders: busyOrders.map((order) => order.master.orderId),
        branchId: busyOrders.length > 0 ? busyOrders[0].master.branchId : null,
      });

      /******************************************************/

      let busyCreatedOrders = busyOrders.filter(
        (order) => order.master.statusId == 1
      );
      let busyActiveOrders = busyOrders.filter(
        (order) => order.master.statusId != 1
      );

      /***********************************************************/

      //Clear the created orders timeout if exist
      busyCreatedOrders.map((order) => {
        let { timeoutFunction } =
          activeOrders.get(parseInt(order.master.orderId)) || {};

        if (timeoutFunction) {
          clearTimeout(timeoutFunction);
          /***********************************************************/
          console.log(
            "Started cycle from GoOnline, order",
            order.master.orderId
          );
          //Send the order to the next driver
          orderCycle({
            orderId: order.master.orderId,
            driverIdSentFrom: driverId,
          });
        }
      });

      /***************************************************/

      let isOnline = status == 1 ? true : false;
      let isForced = false;
      if (busyActiveOrders.length > 0 && status == 1) isOnline = true;
      if (busyActiveOrders.length > 0 && status == 2) {
        isOnline = true;
        isForced = true;
      }
      if (busyActiveOrders.length == 0 && status == 1) isOnline = true;
      if (busyActiveOrders.length == 0 && status == 2) isOnline = false;

      /***********************************************************/
      //Remove all created orders if the driver wants to go offline
      const { branchId, busyOrders: busyOrdersMemory } = busyDrivers.get(
        driverId
      ) || {
        busyOrders: [],
        branchId: null,
      };

      //Remove them from memory
      busyDrivers.set(driverId, {
        busyOrders: busyOrdersMemory.filter(
          (id) => !busyCreatedOrders.includes(id)
        ),
        branchId:
          busyOrdersMemory.filter((id) => !busyCreatedOrders.includes(id))
            .length == 0
            ? null
            : branchId,
      });
      /***********************************************************/
      //Update the driver
      await DriverModel.updateOne(
        { driverId },
        {
          $set: {
            isOnline,
            isBusy: busyActiveOrders.length > 0 ? true : false,
          },
        }
      );
      /***************************************************/
      //Emit GoOnline with updated status
      socket.emit("GoOnline", {
        status: !isForced,
        isAuthorize: true,
        isOnline,
        message: `The driver is set to ${isOnline ? "online" : "offline"}`,
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
  });
};
