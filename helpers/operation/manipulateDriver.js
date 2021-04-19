const Sentry = require('@sentry/node');
const OrderModel = require('../../models/Order');
const { busyDrivers } = require('../../globals');

module.exports = async (driver) => {
	try {
		let { driverId, isBusy, isOnline } = driver || {};

		//Get the ordersIds from memory
		let busyOrders = await OrderModel.find({ 'master.driverId': driverId, 'master.statusId': { $in: [3, 4] } });

		//Add the order to the driver object
		driver = { ...driver, orders: busyOrders };

		/* 
      1 ==> available
      2 ==> busy
      3 ==> offline
    */

		//Put the status of the driver
		let status = isOnline && !isBusy ? 1 : isBusy && busyOrders.length > 0 ? 2 : !isOnline ? 3 : 1;

		driver = { status, ...driver };

		return {
			status: true,
			driver,
		};
	} catch (e) {
		Sentry.captureException(e);

		console.log(`Error in manipulateDriver, error: ${e.message}`);

		return {
			status: false,
			message: `Error in manipulateDriver, error: ${e.message}`,
		};
	}
};
