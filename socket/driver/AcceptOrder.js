const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");
const { updateOrderStatus, getEstimatedDistanceDuration } = require("../../helpers");
const { activeOrders, drivers, busyDrivers, driverHasTakenAction } = require("../../globals");
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");
const LANG = require("../../util/translation");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
	socket.on("AcceptOrder", async ({ orderId, driverId, token, language }) => {
		/******************************************************/
		/*
		 * Start the Event Locker from here
		 */

		if (!EventLocks.has(orderId)) EventLocks.set(orderId, new Mutex());

		const releaseEvent = await EventLocks.get(orderId).acquire();

		try {
			console.log(`AcceptOrder event was called by driver: ${driverId}, order: ${orderId}`);

			/********************************************************/
			//Developement errors
			if (!orderId)
				return socket.emit("AcceptOrder", {
					status: false,
					message: "orderId is missing",
				});
			if (!driverId)
				return socket.emit("AcceptOrder", {
					status: false,
					message: "driverId is missing",
				});
			if (!token)
				return socket.emit("AcceptOrder", {
					status: false,
					message: "token is missing",
				});

			/********************************************************/
			//Parsing
			driverId = parseInt(driverId);
			orderId = parseInt(orderId);

			//Check if driver has taken any action before
			if (driverHasTakenAction.has(orderId)) {
				let drivers = driverHasTakenAction.get(orderId);

				if (drivers.find((driver) => driver.driverId == driverId && driver.tookAction)) {
					return socket.emit("AcceptOrder", {
						status: false,
						isAuthorize: false,
						isOnline: false,
						message: LANG(language).ALREADY_TAKEN_ACTION,
					});
				}
			}

			driverHasTakenAction.set(orderId, [
				...(driverHasTakenAction.get(orderId) || []),
				{
					driverId,
					tookAction: true,
				},
			]);

			/********************************************************/

			//Check if token is valid
			let driverSearch = await DriverModel.findOne({
				driverId,
				accessToken: token,
			});

			if (!driverSearch) {
				return socket.emit("AcceptOrder", {
					status: false,
					isAuthorize: false,
					isOnline: false,
					message: LANG(language).NOT_AUTHORIZED,
				});
			}

			/******************************************************/

			//Check if order exist on DB
			let orderSearch = await OrderModel.findOne({
				"master.orderId": orderId,
				"master.driverId": { $ne: driverId },
				driversFound: {
					$elemMatch: { driverId, requestStatus: { $ne: 4 } },
				},
			});

			if (orderSearch)
				return socket.emit("AcceptOrder", {
					status: false,
					isAuthorize: true,
					message: LANG(language).ORDER_REJECTED_CANCELLED({ orderId }),
					orderId,
				});

			/***************************************************/
			//Check if the driver have received orders
			const receivedOrders = await OrderModel.find({
				"master.driverId": driverId,
				"master.statusId": 4,
			});

			if (receivedOrders.length != 0) {
				return socket.emit("AcceptOrder", {
					status: false,
					isAuthorize: true,
					message: LANG(language).YOU_HAVE_ORDERS_ALREADY,
					orderId,
				});
			}

			/***************************************************/

			orderSearch = await OrderModel.findOne({
				"master.orderId": orderId,
			});

			if (!orderSearch)
				return socket.emit("AcceptOrder", {
					status: false,
					isAuthorize: true,
					message: LANG(language).NO_ORDER_FOUND({ orderId }),
					orderId,
				});

			let branchDistance = 1.5; //default
			//Get the driver distance & duration
			let estimation = await getEstimatedDistanceDuration({
				pickupLng: driverSearch.location.coordinates[0],
				pickupLat: driverSearch.location.coordinates[1],
				dropoffLng: orderSearch.master.branchLocation.coordinates[0],
				dropoffLat: orderSearch.master.branchLocation.coordinates[1],
			});

			if (estimation.status) branchDistance = estimation.estimatedDistance;

			/******************************************************/
			//Set this driver as the accepter of this order
			await OrderModel.updateOne(
				{
					"master.orderId": orderId,
					driversFound: {
						$elemMatch: { driverId },
					},
				},
				{
					$set: {
						"driversFound.$.requestStatus": 1, //Accept
						"driversFound.$.estimatedDistance": branchDistance,
						"driversFound.$.location": {
							coordinates: [driverSearch.location.coordinates[0], driverSearch.location.coordinates[1]],
						},
						"driversFound.$.actionDate": new Date().constructor({
							timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
						}),

						"master.driverId": driverId,
					},
				}
			);
			/******************************************************/

			//Update the order
			const updateResult = await updateOrderStatus({
				orderId,
				statusId: 3,
			});

			if (!updateResult.status) {
				Sentry.captureMessage(`Error in API, AcceptOrder event, order: ${orderId}, error: ${updateResult.message}`);

				return socket.emit("AcceptOrder", updateResult);
			}

			/******************************************************/
			//Update the order status on DB
			await OrderModel.updateOne(
				{
					"master.orderId": orderId,
				},
				{
					$set: {
						"master.statusId": 3,
						"master.branchDistance": branchDistance,
						"master.driverId": driverId,
					},
				}
			);

			/******************************************************/

			const { busyOrders } = busyDrivers.get(driverId) || { busyOrders: [] };

			//Update in memory first
			busyDrivers.set(driverId, {
				busyOrders: [...new Set([...busyOrders, orderId])],
				branchId: orderSearch.master.branchId,
			});

			/******************************************************/
			//Get the order again
			orderSearch = await OrderModel.findOne({ "master.orderId": orderId });
			orderSearch = orderSearch && orderSearch.toObject();

			/***********************************************************/
			//Clear last timeout of the order if exist
			let { timeoutFunction } = activeOrders.get(orderId) || {};

			if (timeoutFunction) {
				clearTimeout(timeoutFunction);
			}

			activeOrders.delete(orderId);

			/******************************************************/

			//Emit to other drivers that this driver accepted the trip
			//Drivers on the same range only

			for (let driver of orderSearch.driversFound) {
				if (driver.driverId != driverId && driver.requestStatus == 4) {
					io.to(parseInt(drivers.get(driver.driverId))).emit("AcceptTrip", {
						status: false,
						isAuthorize: true,
						message: LANG(language).ANOTHER_DRIVER_ACCEPTED,
					});
				}
			}
			/******************************************************/

			//Make sure driver is busy
			await DriverModel.updateOne(
				{
					driverId,
				},
				{
					isBusy: true,
				}
			);

			/***************************************************/
			socket.emit("AcceptOrder", {
				status: true,
				message: LANG(language).ORDER_ACCEPTED,
				orderId,
			});

			console.log(`driver ${driverId}`, busyDrivers.get(driverId));

			/******************************************************/
		} catch (e) {
			Sentry.captureException(e);

			console.log(`Error in AcceptOrder event: ${e.message}`, e);
			return socket.emit("AcceptOrder", {
				status: false,
				message: `Error in AcceptOrder event: ${e.message}`,
				orderId,
			});
		} finally {
			releaseEvent(); //Stop event locker
		}
	});
};
