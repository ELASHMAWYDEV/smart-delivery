const { customers } = require("../../globals");

module.exports = (io, socket) => {
  socket.on("JoinCustomer", async ({ orderId }) => {
    try {
      customers.set(orderId, socket.id);
    } catch (e) {
      socket.emit("JoinCustomer", {
        status: false,
        message: `Error in JoinCustomer event: ${e.message}`,
      });
    }
  });
};