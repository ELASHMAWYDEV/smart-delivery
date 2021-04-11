const Sentry = require("@sentry/node");
const { disconnectDriver } = require("../helpers");

//Models
const DriverModel = require("../models/Driver");

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

        const driverSearch = await DriverModel.findOne({
          driverId: driverId[0],
        });
        driverSearch = driverSearch && driverSearch.toObject();

        //Check if driver is online & Send notifications to him after disconnect
        if (driverSearch && driverSearch.isOnline) {
          await DriverModel.updateOne(
            { driverId: driverId[0] },
            { isOnline: false }
          );
        }

        /************************************************************/
      }

      //Delete if client
      if (!driverId && clientId && clientId.length != 0) {
        clients.delete(clientId[0]);

        console.log(`Client ${clientId[0]} disconnected`);
      }
    } catch (e) {
      Sentry.captureException(e);

      console.log(`Error on disconnect, error: ${e.message}`, e);
    }
  });
};
