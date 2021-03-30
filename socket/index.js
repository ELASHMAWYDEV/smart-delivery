const DriverModel = require("../models/Driver");
const { drivers } = require("../globals");

module.exports = (io) => {
  io.on("connection", async (socket) => {
    console.log(`New user connected: ${socket.id}`);

    const { query } = socket.handshake;

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
        socket.emit("JoinDriver", {
          status: true,
          isAuthorize: true,
          isOnline: driverSearch.isOnline,
          message: `join success, socket id: ${socket.id}`,
        });

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

/*



  start app ==> join (API) ==> isHasTrip -true -false (storage) ==> GoOnline -1 -2

  onConnect ==> GoOnline  (last state)
*/
