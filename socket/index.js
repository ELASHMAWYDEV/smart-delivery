const { drivers } = require("../globals");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`New user connected: ${socket.id}`);

    if (socket.handshake.query.driverId) {
      drivers.set(parseInt(socket.handshake.query.driverId), socket.id);
      console.log(drivers);
    }

    require("./disconnect")(io, socket);

    //driver
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
