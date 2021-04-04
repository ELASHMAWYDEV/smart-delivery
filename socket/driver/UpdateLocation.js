//Models
const DriverModel = require("../../models/Driver");
const OrderModel = require("../../models/Order");

//Globals
let { drivers, customers } = require("../../globals");

module.exports = (io, socket) => {
  socket.on("UpdateLocation", async ({ driverId, token, lat, lng }) => {
    console.log(`UpdateLocation Event Called, driver id: ${driverId}`);

    try {
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
    } catch (e) {
      console.log(`Error in UpdateLocation, error: ${e.message}`);
      socket.emit("UpdateLocation", {
        status: false,
        message: e.message,
      });
    }
  });
};
