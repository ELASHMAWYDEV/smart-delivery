const Sentry = require("@sentry/node");
const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const DeliverySettingsModel = require("../models/DeliverySettings");
const { activeOrderDrivers } = require("../globals");
const { driverTypes } = require("../models/constants");

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

    //Get all driversIds from DB if choosedDrivers is empty
    if (choosedDrivers.length == 0) {
      const driversSearch = await DriverModel.find({});
      choosedDrivers = driversSearch.map((driver) => driver.driverId);
    }

    let driverSearch = await DriverModel.aggregate([
      {
        $geoNear: {
          key: "location",
          near: {
            type: "Point",
            coordinates: [
              orderSearch.master.branchLocation.coordinates[0],
              orderSearch.master.branchLocation.coordinates[1],
            ],
          },
          distanceField: "distination.calculated",
          maxDistance: maxDistance * 1000,
          includeLocs: "distination.location",
          spherical: true,
          query: {
            isOnline: true,
            isBusy: false,
            isDeleted: false,
            $and: [{ driverId: { $nin: driversIds } }, { driverId: { $in: choosedDrivers } }],
          },
        },
      },
      // Sort by driverType priority
      {
        $addFields: {
          driverTypeSortId: {
            $switch: {
              branches: [
                { case: { $eq: ["$driverType", driverTypes.CONTRACTOR] }, then: 1 },
                { case: { $eq: ["$driverType", driverTypes.FREELANCER] }, then: 2 },
              ],
            },
          },
        },
      },
      {
        $sort: {
          driverTypeSortId: 1,
        },
      },
      // Get only 1 driver
      {
        $limit: 1,
      },
    ]);

    //If no driver found
    if (!driverSearch) {
      return { status: false, message: "No drivers found" };
    }

    //If the driver was found, add him to the trip driverFound & activeOrderDrivers arrays
    activeOrderDrivers.set(orderId, [...(activeOrderDrivers.get(orderId) || []), driverSearch.driverId]);

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
