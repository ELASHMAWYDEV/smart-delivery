const Sentry = require("@sentry/node");
const DriverModel = require("../models/Driver");
const { drivers, disconnectInterval } = require("../globals");

module.exports = (io) => {
  try {
    io.on("connection", async (socket) => {
      const { query } = socket.handshake;
      // console.log(
      //   `New user connected: ${socket.id}, driverId: ${query.driverId}`
      // );

      if (query.driverId && query.token) {
        query.driverId = parseInt(query.driverId); //Parse the driverId

        //Remove from the disconnect interval
        //disconnectInterval.delete(driverId);

        // //Check if token is valid
        // let driverSearch = await DriverModel.findOne({
        //   driverId: query.driverId,
        //   accessToken: query.token,
        // });

        // if (!driverSearch) {
        //   socket.emit("JoinDriver", {
        //     status: false,
        //     isAuthorize: false,
        //     isOnline: false,
        //     message: "You are not authorized",
        //   });
        // } else {
        //   //Update the driver on drivers Map
        //   drivers.set(query.driverId, socket.id);
        // }
      }

      /**************************************************************/
      //Client --> Restaurant
      require("./customer/JoinCustomer")(io, socket);

      /**************************************************************/
      //Operation
      require("./operation/OperationGetDrivers")(io, socket);

      /**************************************************************/
      //driver
      require("./driver/JoinDriver")(io, socket);
      require("./driver/GoOnline")(io, socket);
      require("./driver/AcceptOrder")(io, socket);
      require("./driver/RejectOrder")(io, socket);
      require("./driver/IgnoreOrder")(io, socket);
      require("./driver/ReceiveOrder")(io, socket);
      require("./driver/DeliverOrder")(io, socket);
      require("./driver/UpdateLocation")(io, socket);
      require("./driver/HaveSeenOrder")(io, socket);

      /**************************************************************/
      require("./disconnect")(io, socket);
    });
  } catch (e) {
    Sentry.captureException(e);
    console.log(`Error in socket index: ${e.message}`);
  }
};
