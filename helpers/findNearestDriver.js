const Sentry = require("@sentry/node");
const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const DeliverySettingsModel = require("../models/DeliverySettings");
const { activeOrderDrivers } = require("../globals");

module.exports = async ({ orderId, driversIds: choosedDrivers = [] }) => {
  try {
    //Get global intervals
    let maxDistance = 10; //Km
    const settings = await DeliverySettingsModel.findOne({});
    if (settings && settings.maxDistance) {
      maxDistance = settings.maxDistance;
    }

    const orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    let driversIds = activeOrderDrivers.get(orderId);

    let driverSearch = await DriverModel.findOne({
      isOnline: true,
      isDeleted: false,
      isBusy: false,
      $or: [
        { driverId: { $nin: driversIds } },
        { driverId: { $in: choosedDrivers } },
      ],
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [
              orderSearch.master.branchLocation.coordinates[0],
              orderSearch.master.branchLocation.coordinates[1],
            ],
          },
          $maxDistance: maxDistance * 1000,
        },
      },
    });

    //If no driver found
    if (!driverSearch) {
      return { status: false, message: "No drivers found" };
    }

    //If the driver was found, add him to the trip driverFound & activeOrderDrivers arrays
    activeOrderDrivers.set(orderId, [
      ...(activeOrderDrivers.get(orderId) || []),
      driverSearch.driverId,
    ]);

    /******************************************************/

    return { status: true, driverId: driverSearch.driverId };

    /******************************************************/
  } catch (e) {
    Sentry.captureException(e);

    console.log(`Error in findNearestDriver()`, e);
    return {
      status: false,
      message: `Error in findNearestDriver(): ${e.message}`,
    };
  }
};
