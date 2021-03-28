//Globals
let { clients, drivers } = require("../globals");

module.exports = (io, socket) => {
  socket.on("disconnect", async () => {
    try {
      //Check if user is client or dirver
      let clientId = [...clients].find(
        ([id, socketId]) => socket.id == socketId
      ); //[2, 'socket id']
      let driverId = [...drivers].find(
        ([id, socketId]) => socket.id == socketId
      );

      //Delete if driver
      if (!clientId && driverId && driverId.length != 0) {
        drivers.delete(driverId[0]);
        console.log(`Driver ${driverId[0]} disconnected`);

        /************************************************************/
      }

      //Delete if client
      if (!driverId && clientId && clientId.length != 0) {
        clients.delete(clientId[0]);

        console.log(`Client ${clientId[0]} disconnected`);
      }
    } catch (e) {
      console.log(`Error on disconnect, error: ${e.message}`, e);
    }
  });
};
