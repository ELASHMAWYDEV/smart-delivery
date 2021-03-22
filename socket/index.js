module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`New user connected: ${socket.id}`);

    //driver
    require("./driver/GoOnline")(io, socket);
    require("./driver/JoinDriver")(io, socket);
  });
};
