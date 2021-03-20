module.exports = (io, socket) => {
  socket.on("NewTripRequest", async () => {
    try {
      console.log("hello");
    } catch (e) {
      socket.emit("NewTripRequest", {
        status: false,
        message: `Error in NewOrderRequest event: ${e.message}`,
      });
    }
  });
};
