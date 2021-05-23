const Sentry = require('@sentry/node');
const orderCycle = require('../helpers/orderCycle');

//Models
const DriverModel = require('../models/Driver');
const OrderModel = require('../models/Order');

//Globals
let { clients, drivers, activeOrders, busyDrivers } = require('../globals');

module.exports = (io, socket) => {
	socket.on('disconnect', async () => {
		try {
			//Check if user is client or dirver
			let clientId = [...clients].find(([id, socketId]) => socket.id == socketId); //[2, 'socket id']
			let driverId = [...drivers].find(([id, socketId]) => socket.id == socketId);

			//Delete if driver
			if (!clientId && driverId && driverId.length != 0) {
				drivers.delete(driverId[0]);
				// //Delete in memory first
				// busyDrivers.delete(driverId[0]);

				let driverSearch = await DriverModel.findOne({
					driverId: driverId[0],
				});
				driverSearch = driverSearch && driverSearch.toObject();

				// Search for busy orders
				let busyOrders = await OrderModel.countDocuments({
					'master.statusId': { $in: [1, 3, 4] },
					'master.driverId': driverId[0],
				});

				console.log(`Driver ${driverId[0]} disconnected from socket, online: ${driverSearch.isOnline}`);
				//Set to offline || online
				await DriverModel.updateOne(
					{ driverId: driverId[0] },
					{
						isOnline: busyOrders > 0 ? true : false,
						onlineBeforeDisconnect: driverSearch.isOnline,
						disconnectTime: new Date().getTime(),
					}
				);

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
