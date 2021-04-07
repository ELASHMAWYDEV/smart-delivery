const { Mutex } = require("async-mutex");
//Models
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");

//Globals
let { drivers, customers } = require("../../globals");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
  socket.on("UpdateLocation", async ({ driverId, token, lat, lng }) => {
    try {
      console.log(`UpdateLocation Event Called, driver id: ${driverId}`);
      /***************************************************/
      //Update the location in DB
      let driverSearch = await DriverModel.findOne({
        driverId,
        accessToken: token,
      });
      if (!driverSearch) {
        return socket.emit("UpdateLocation", {
          status: false,
          isAuthorize: false,
          message: "You are not authorized",
        });
      }

      /******************************************************/

      /*
       * Start the Event Locker from here
       */

      if (!EventLocks.has(driverId)) EventLocks.set(driverId, new Mutex());

      const releaseEvent = await EventLocks.get(driverId).acquire();
      /******************************************************/

      try {
        //Add driver to socket
        drivers.set(parseInt(driverId), socket.id);

        await DriverModel.updateOne(
          { driverId },
          {
            $set: {
              oldLocation: {
                coordinates: [
                  driverSearch.location.coordinates[0],
                  driverSearch.location.coordinates[1],
                ],
                type: "Point",
              },
              location: {
                coordinates: [lng, lat],
                type: "Point",
              },
              updateLocationDate: new Date().constructor({
                timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
              }),
            },
          }
        );

        socket.emit("UpdateLocation", {
          status: true,
          isAuthorize: true,
          isOnline: driverSearch.isOnline,
          message: "Location updated successfully",
        });

        /***************************************************/
        //Check if the driver has a trip with statusId [3, 4]

        const busyOrders = await OrderModel.find({
          "master.statusId": { $in: [3, 4] },
          "master.driverId": driverId,
        });

        for (let order of busyOrders) {
          //Send the driver's location to the customer
          io.to(customers.get(order.master.orderId)).emit("TrackOrder", {
            lat,
            lng,
          });
        }
        /***************************************************/
      } finally {
        releaseEvent(); //Stop event locker
      }
    } catch (e) {
      console.log(`Error in UpdateLocation, error: ${e.message}`);
      socket.emit("UpdateLocation", {
        status: false,
        message: e.message,
      });
    }
  });
};
