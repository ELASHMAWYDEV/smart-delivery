module.exports = (io, socket) => {
  socket.on("Join", async ({ driverId, token }) => {
    try {

      
    } catch (e) {
      socket.emit("JoinDriver", {
        status: false,
        message: `Error in JoinDriver event: ${e.message}`,
      });
    }
  });
};
