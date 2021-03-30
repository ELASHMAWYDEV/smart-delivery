const { clients } = require("../../globals");

module.exports = (io, socket) => {
  socket.on("JoinClient", async ({ driverId, token }) => {
    try {
      clients.set(driverId, socket.id);
    } catch (e) {
      socket.emit("JoinClient", {
        status: false,
        message: `Error in JoinClient event: ${e.message}`,
      });
    }
  });
};
