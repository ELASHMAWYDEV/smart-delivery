const Sentry = require('@sentry/node');

//Models
const DriverModel = require('../../models/Driver');

module.exports = async ({ lat, lng, maxDistance }) => {
	try {
		//Get all availabel drivers (online, not busy)
		let available = await DriverModel.find({
			isOnline: true,
			isBusy: false,
			isDeleted: false,
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

		//Get all offline drivers
		let offline = await DriverModel.find({
			isOnline: false,
			isDeleted: false,
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

		//Get all busy drivers
		let busy = await DriverModel.find({
			isBusy: true,
			isDeleted: false,
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

		//Get the count of all drivers
		let total = await DriverModel.find({
			isDeleted: false,
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

		return {
			status: true,
			countsInRange: {
				available: available.length,
				offline: offline.length,
				busy: busy.length,
				total: total.length,
			},
		};
	} catch (e) {
		Sentry.captureException(e);

		console.log(`Error in countDriversInRange, error: ${e.message}`);

		return {
			status: false,
			message: `Error in countDriversInRange, error: ${e.message}`,
		};
	}
};
