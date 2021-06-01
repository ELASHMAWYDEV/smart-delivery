const Sentry = require("@sentry/node");

//Models
const DriverModel = require("../../models/Driver");

module.exports = async ({ driversIds, lat, lng, maxDistance, companyId }) => {
	try {
		//Get all availabel drivers (online, not busy)
		let available = await DriverModel.find({
			...(companyId && { companyId }),
			driverId: { $in: driversIds },
			isOnline: true,
			isBusy: false,
			isDeleted: false,
			location: {
				$nearSphere: {
					$geometry: {
						type: "Point",
						coordinates: [lng, lat],
					},
					$maxDistance: lat == 0 ? Infinity : maxDistance * 1000,
				},
			},
		});

		//Get all offline drivers
		let offline = await DriverModel.find({
			...(companyId && { companyId }),
			driverId: { $in: driversIds },
			isOnline: false,
			isDeleted: false,
			location: {
				$nearSphere: {
					$geometry: {
						type: "Point",
						coordinates: [lng, lat],
					},
					$maxDistance: lat == 0 ? Infinity : maxDistance * 1000,
				},
			},
		});

		//Get all busy drivers
		let busy = await DriverModel.find({
			...(companyId && { companyId }),
			driverId: { $in: driversIds },
			isBusy: true,
			isDeleted: false,
			location: {
				$nearSphere: {
					$geometry: {
						type: "Point",
						coordinates: [lng, lat],
					},
					$maxDistance: lat == 0 ? Infinity : maxDistance * 1000,
				},
			},
		});

		//Get the count of all drivers
		let total = await DriverModel.find({
			...(companyId && { companyId }),
			driverId: { $in: driversIds },
			isDeleted: false,
			location: {
				$nearSphere: {
					$geometry: {
						type: "Point",
						coordinates: [lng, lat],
					},
					$maxDistance: lat == 0 ? Infinity : maxDistance * 1000,
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
