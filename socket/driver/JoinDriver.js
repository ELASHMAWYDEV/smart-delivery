const { drivers } = require("../../globals");

module.exports = (io, socket) => {
  socket.on("Join", async ({ driverId, token }) => {
    try {
      drivers.set(driverId, socket.id);
    } catch (e) {
      socket.emit("JoinDriver", {
        status: false,
        message: `Error in JoinDriver event: ${e.message}`,
      });
    }
  });
};
