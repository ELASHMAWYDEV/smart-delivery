const Sentry = require("@sentry/node");
const { clients } = require("../../globals");

module.exports = (io, socket) => {
  socket.on("JoinClient", async ({ driverId, token }) => {
    try {
      clients.set(driverId, socket.id);
    } catch (e) {
      Sentry.captureException(e);
      console.log(`Error in JoinClient event, ${e.message}`, e);
      socket.emit("JoinClient", {
        status: false,
        message: `Error in JoinClient event: ${e.message}`,
      });
    }
  });
};
