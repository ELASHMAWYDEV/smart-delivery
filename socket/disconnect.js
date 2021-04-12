const Sentry = require("@sentry/node");
const orderCycle = require("../helpers/orderCycle");

//Models
const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");

//Globals
let { clients, drivers, activeOrders } = require("../globals");

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

        let driverSearch = await DriverModel.findOne({
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

        if (driverSearch && driverSearch.isBusy) {
          //Check if driver has any busy orders
          const busyOrders = await OrderModel.find({
            "master.statusId": { $in: [1, 3, 4] },
            "master.driverId": driverId[0],
          });

          //Set the driver to be not busy
          await DriverModel.updateOne(
            {
              driverId: driverId[0],
            },
            {
              isBusy: busyOrders.length >= 1 ? true : false,
            }
          );

          //Clear the created orders timeout if exist
          busyOrders.map((order) => {
            if (order.master.statusId == 1) {
              let { timeoutFunction } =
                activeOrders.get(parseInt(order.master.orderId)) || {};

              if (timeoutFunction) {
                clearTimeout(timeoutFunction);
              }

              /***********************************************************/
              //Send the order to the next driver
              orderCycle({ orderId: order.master.orderId });
            }
          });
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
