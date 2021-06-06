const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");

//Models
const OrderModel = require("../../models/Order");

/*
 * @param EventLocks is a map of mutex interfaces to prevent race condition in the event
 * race condition is when user triggers the event twice at the same milli second
 */
let EventLocks = new Map();

module.exports = (io, socket) => {
	socket.on("HaveSeenOrder", async ({ driverId, token, language, orderId }) => {
		/*
		 * Start the Event Locker from here
		 */

		if (!EventLocks.has(driverId)) EventLocks.set(driverId, new Mutex());

		const releaseEvent = await EventLocks.get(driverId).acquire();

		/***************************************************/

		try {
			console.log(`HaveSeenOrder event called driver: ${driverId} order: ${orderId}`);

			//Developement errors
			if (!orderId)
				return socket.emit("HaveSeenOrder", {
					status: false,
					message: "branchId is missing",
				});
			if (!driverId)
				return socket.emit("HaveSeenOrder", {
					status: false,
					message: "driverId is missing",
				});
			if (!token)
				return socket.emit("HaveSeenOrder", {
					status: false,
					message: "token is missing",
				});

			/*****************************************************/

			//Update the driver isSeenOrder on DB
			await OrderModel.updateOne(
				{
					"master.orderId": orderId,
					driversFound: {
						$elemMatch: {
							driverId,
						},
					},
				},
				{
					$set: {
						"driversFound.$.isSeenOrder": true,
					},
				}
			);

			return socket.emit("HaveSeenOrder", {
				status: true,
				message: "Order have been marked as seen",
			});
		} catch (e) {
			Sentry.captureException(e);

			console.log(`Error in HaveSeenOrder, error: ${e.message}`);
			return socket.emit("HaveSeenOrder", {
				status: false,
				message: `Error in HaveSeenOrder, error: ${e.message}`,
			});
		} finally {
			releaseEvent();
		}
	});
};
