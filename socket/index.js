const DriverModel = require("../models/Driver");
const { drivers } = require("../globals");

module.exports = (io) => {
  io.on("connection", async (socket) => {
    const { query } = socket.handshake;
    console.log(
      `New user connected: ${socket.id}, driverId: ${query.driverId}`
    );

    if (query.driverId && query.token) {
      query.driverId = parseInt(query.driverId); //Parse the driverId

      //Check if token is valid
      let driverSearch = await DriverModel.findOne({
        driverId: query.driverId,
        accessToken: query.token,
      });

      if (!driverSearch) {
        socket.emit("JoinDriver", {
          status: false,
          isAuthorize: false,
          isOnline: false,
          message: "You are not authorized",
        });
      } else {
        //Update the driver on drivers Map
        drivers.set(query.driverId, socket.id);
      }
    }

    /**************************************************************/
    require("./disconnect")(io, socket);

    /**************************************************************/
    //driver
    require("./driver/JoinDriver")(io, socket);
    require("./driver/GoOnline")(io, socket);
    require("./driver/AcceptOrder")(io, socket);
    require("./driver/RejectOrder")(io, socket);
    require("./driver/IgnoreOrder")(io, socket);
    require("./driver/ReceiveOrder")(io, socket);
    require("./driver/DeliverOrder")(io, socket);
  });
};
