const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");
const {
  updateOrderStatus,
  getEstimatedDistanceDuration,
} = require("../../helpers");
const { activeOrders, drivers } = require("../../globals");
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
  socket.on("AcceptOrder", async ({ orderId, driverId, token }) => {
    try {
      console.log(
        `AcceptOrder event was called by driver: ${driverId}, order: ${orderId}`
      );

      /********************************************************/
      //Developement errors
      if (!orderId)
        return socket.emit("AcceptOrder", {
          status: false,
          message: "orderId is missing",
        });
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
        //Check if order wasn't accepted by another driver
        //Check memory first for fast seacrch
        if (activeOrders.has(orderId))
          return socket.emit("AcceptOrder", {
            status: false,
            isAuthorize: true,
            message: `Sorry another driver accepted this order #${orderId}`,
            orderId,
          });
        /******************************************************/
        //Check if order exist on DB
        let orderSearch = await OrderModel.findOne({
          "master.orderId": orderId,
          "master.statusId": { $nin: 1 },
          "master.driverId": { $ne: driverId },
          driversFound: {
            $elemMatch: { driverId, requestStatus: { $ne: 1 } },
          },
        });

        if (orderSearch)
          return socket.emit("AcceptOrder", {
            status: false,
            isAuthorize: true,
            message: `You may have reject this order #${orderId} or the board may have canceled it`,
            orderId,
          });

        /******************************************************/
        //Save the driver to the active orders
        activeOrders.set(orderId, driverId);
        /***************************************************/

        orderSearch = await OrderModel.findOne({
          "master.orderId": orderId,
        });

        if (!orderSearch)
          return socket.emit("AcceptOrder", {
            status: false,
            isAuthorize: true,
            message: `There is no order with id #${orderId}`,
            orderId,
          });

        let branchDistance = 1.5; //default
        //Get the driver distance & duration
        let estimation = await getEstimatedDistanceDuration({
          pickupLng: driverSearch.location.coordinates[0],
          pickupLat: driverSearch.location.coordinates[1],
          dropoffLng: orderSearch.master.branchLocation.coordinates[0],
          dropoffLat: orderSearch.master.branchLocation.coordinates[1],
        });

        if (estimation.status) branchDistance = estimation.estimatedDistance;

        /******************************************************/
        //Set this driver as the accepter of this order
        await OrderModel.updateOne(
          {
            "master.orderId": orderId,
            driversFound: {
              $elemMatch: { driverId },
            },
          },
          {
            $set: {
              "driversFound.$.requestStatus": 1, //Accept
              "driversFound.$.estimatedDistance": branchDistance,
              "driversFound.$.location": {
                coordinates: [
                  driverSearch.location.coordinates[0],
                  driverSearch.location.coordinates[1],
                ],
              },
              "driversFound.$.actionDate": new Date().constructor({
                timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
              }),

              "master.driverId": driverId,
            },
          }
        );
        /******************************************************/

        //Update the order
        const updateResult = await updateOrderStatus({
          orderId,
          statusId: 3,
        });

        if (!updateResult.status) {
          activeOrders.delete(orderId);
          //Update the order status on DB
          await OrderModel.updateOne(
            {
              "master.orderId": orderId,
            },
            {
              $set: {
                "master.statusId": 1,
                "master.branchDistance": 0,
                "master.driverId": null,
              },
            }
          );
          return socket.emit("AcceptOrder", updateResult);
        }

        /******************************************************/
        //Update the order status on DB
        await OrderModel.updateOne(
          {
            "master.orderId": orderId,
          },
          {
            $set: {
              "master.statusId": 3,
              "master.branchDistance": branchDistance,
              "master.driverId": driverId,
            },
          }
        );
        /******************************************************/
        //Get the order again
        orderSearch = await OrderModel.findOne({ "master.orderId": orderId });
        orderSearch = orderSearch && orderSearch.toObject();
        /******************************************************/

        //Emit to other drivers that this driver accepted the trip
        //Drivers on the same range only

        for (let driver of orderSearch.driversFound) {
          if (driver.driverId != driverId && driver.requestStatus == 4) {
            io.to(parseInt(drivers.get(driver.driverId))).emit("AcceptTrip", {
              status: false,
              isAuthorize: true,
              message: "Sorry, another driver accepted the trip",
            });

            //If the driver is on socket set isSeenNoCatch
          }
        }
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

        /***************************************************/
        socket.emit("AcceptOrder", {
          status: true,
          message: `Order #${orderId} accepted successfully`,
          orderId,
        });

        /***************************************************/
      } finally {
        releaseEvent(); //Stop event locker
      }
      /***************************************************/
      //In case 2 drivers accepted at the same time  -------> EventLocks solved this issue
      // setTimeout(async () => {
      //   let orderSearch = await OrderModel.findOne({
      //     orderId,
      //     driverId,
      //   });

      //   //Send error to the driver
      //   if (!orderSearch) {
      //     socket.emit("AcceptTrip", {
      //       status: false,
      //       isAuthorize: true,
      //       message: `Sorry, you couldn't catch order #${orderId}. Another driver accepted it, hard luck next time :)`,
      //     });
      //   }
      // }, 2000);

      /******************************************************/
    } catch (e) {
      Sentry.captureException(e);

      console.log(`Error in AcceptOrder event: ${e.message}`, e);
      return socket.emit("AcceptOrder", {
        status: false,
        message: `Error in AcceptOrder event: ${e.message}`,
        orderId,
      });
    }
  });
};
