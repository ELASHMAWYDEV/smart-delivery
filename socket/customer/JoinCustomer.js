const Sentry = require("@sentry/node");
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const { customers } = require("../../globals");

module.exports = (io, socket) => {
  socket.on("JoinCustomer", async ({ orderId }) => {
    try {
      console.log(`New Customer joined: ${orderId}`);
      customers.set(parseInt(orderId), socket.id);

      const orderSearch = await OrderModel.findOne({
        "master.orderId": orderId,
      });

      if (!orderSearch) {
        return socket.emit("JoinCustomer", {
          status: false,
          message: `There is no order with id #${orderId}`,
        });
      }

      if (!orderSearch.master.driverId) {
        return socket.emit("JoinCustomer", {
          status: false,
          message: "We can't get the driver's location at the moment",
        });
      }

      //Get the driver location
      const driverSearch = await DriverModel.findOne({
        driverId: orderSearch.master.driverId,
      });

      return socket.emit("JoinCustomer", {
        status: true,
        driverLocation: {
          lng: driverSearch.location.coordinates[0],
          lat: driverSearch.location.coordinates[1],
        },
      });
    } catch (e) {
      Sentry.captureException(e);

      console.log(`Error in JoinCustomer event, ${e.message}`);
      socket.emit("JoinCustomer", {
        status: false,
        message: `Error in JoinCustomer event: ${e.message}`,
      });
    }
  });
};
