module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`New user connected: ${socket.id}`);
  });
};
