const Sentry = require('@sentry/node');

//Models
const DriverModel = require('../../models/Driver');

//Helpers
const { countDrivers, countDriversInRange, manipulateDriver } = require('../../helpers');

//Gloabls
let { admins, clients, busyDrivers } = require('../../globals');

module.exports = (io, socket) => {
	socket.on('OperationGetDrivers', async ({ adminId, clientId, branchId, lat, lng, maxDistance }) => {
		try {
			//Validation
			if (!clientId && !adminId)
				return socket.emit({
					status: false,
					message: 'Neither clientId nor adminId specified',
				});

			if (clientId && !branchId)
				return socket.emit({
					status: false,
					message: 'You must specify a branchId as a client',
				});

			/*****************************************************/
			//Add admin to socket
			if (adminId) {
				admins.set(adminId, socket.id);
			}
			if (clientId) {
				clients.set(clientId, socket.id);
			}

			/*****************************************************/

			/******************************************************/
			//Will receive array || object
			let branchs = [];
			let driversIds = [];

			if (branchId) {
				if (Array.isArray(branchId)) branchs = [...branchs, ...branchId];
				else branchs = [branchId];

				/******************************************************/

				//Get all drivers that have active orders to this branch(s) ---> from memory
				for (let driver of busyDrivers) {
					if (branchs.includes(driver[1].branchId)) {
						driversIds.push(driver[0]);
					}
				}
			} else {
        //Get all driversIds
				const driversSearch = await DriverModel.find({});
				driversIds = driversSearch.map((driver) => driver.driverId);
			}

			//Get all drivers within range (maxDistance)
			let driversSearch = await DriverModel.find({
				driverId: { $in: driversIds },
				location: {
					$nearSphere: {
						$geometry: {
							type: 'Point',
							coordinates: [lng, lat],
						},
						$maxDistance: lat == 0 ? Infinity : maxDistance,
					},
				},
			});

			/*****************************************************/

			//Manipulate drivers
			let finalDrivers = [];
			for (driver of driversSearch) {
				//Check the status & add tripInfo if busy on a trip
				let result = await manipulateDriver(driver.toObject());
				if (!result.status) {
					return socket.emit('OperationGetDrivers', {
						status: false,
						message: result.message,
					});
				}

				finalDrivers = [...finalDrivers, result.driver];
			}

			/*****************************************************/

			//Get the count
			let countsResult = await countDrivers({driversIds});
			if (!countsResult.status) {
				return socket.emit('OperationGetDrivers', {
					status: false,
					message: countsResult.message,
				});
			}

			let counts = countsResult.counts;

			/*****************************************************/

			//Get the count in range of admin
      let countsInRangeResult = await countDriversInRange({
        driversIds,
				lat,
				lng,
				maxDistance,
			});
			if (!countsInRangeResult.status) {
				return socket.emit('OperationGetDrivers', {
					status: false,
					message: countsInRangeResult.message,
				});
			}

			let countsInRange = countsInRangeResult.countsInRange;

			/*****************************************************/
			//Send to the socket
			socket.emit('OperationGetDrivers', {
				status: true,
				drivers: finalDrivers,
				counts,
				countsInRange,
			});
		} catch (e) {
			Sentry.captureException(e);
			console.log(`Error in OperationGetDrivers, error: ${e.message}`);

			socket.emit('OperationGetDrivers', {
				status: false,
				message: `Error in OperationGetDrivers, error: ${e.message}`,
			});
		}
	});
};
