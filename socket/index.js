module.exports = (io) => {
  io.on("connection", (socket) => {
    // console.log(`New user connected: ${socket.id}`);

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
