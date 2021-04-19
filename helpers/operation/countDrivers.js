const Sentry = require('@sentry/node');
//Models
const DriverModel = require('../../models/Driver');

module.exports = async ({ driversIds }) => {
	try {
		//Get all availabel drivers (online, not busy)
		let available = await DriverModel.countDocuments({
			driverId: { $in: driversIds },
			isOnline: true,
			isBusy: false,
			isDeleted: false,
		});

		//Get all offline drivers
		let offline = await DriverModel.countDocuments({
			driverId: { $in: driversIds },
			isOnline: false,
			isDeleted: false,
		});

		//Get all busy drivers
		let busy = await DriverModel.countDocuments({
			driverId: { $in: driversIds },

			isBusy: true,
			isDeleted: false,
		});

		//Get the count of all drivers
		let total = await DriverModel.countDocuments({ driverId: { $in: driversIds }, isDeleted: false });

		return {
			status: true,
			counts: {
				available,
				offline,
				busy,
				total,
			},
		};
	} catch (e) {
		Sentry.captureException(e);

		console.log(`Error in countDrivers, error: ${e.message}`);

		return {
			status: false,
			message: `Error in countDrivers, error: ${e.message}`,
		};
	}
};
