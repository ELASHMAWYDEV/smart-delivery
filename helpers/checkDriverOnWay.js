const Sentry = require("@sentry/node");
const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const SettingsModel = require("../models/DeliverySettings");
const { activeOrderDrivers } = require("../globals");
const { driverTypes } = require("../models/constants");

const getEstimatedDistanceDuration  = require("./getEstimatedDistanceDuration");

let settings;
(async () => {
  settings = await SettingsModel.findOne({});
})();

module.exports = async ({ branchId, orderId, driversIds: choosedDrivers = [], orderDriversLimit = 2 }) => {
  try {
    const orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    // let driversIds = orderSearch.driversFound.map((d) => d.driverId);

    let driversIds = activeOrderDrivers.get(orderId);

    //Get all driversIds from DB if choosedDrivers is empty
    if (choosedDrivers.length == 0) {
      const driversSearch = await DriverModel.find({});
      choosedDrivers = driversSearch.map((driver) => driver.driverId);
    }

    let driversSearch = await DriverModel.aggregate([
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
          maxDistance: Infinity,
          includeLocs: "distination.location",
          spherical: true,
          query: {
            isOnline: true,
            isBusy: true,
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
    ]);

    //If no driver found , send message to client
    if (driversSearch.length == 0) {
      return { status: false, message: "No drivers on way found" };
    }

    /******************************************************/

    for (let driver of driversSearch) {
      //Check driver has how many orders
      const busyOrders = await OrderModel.find({
        "master.statusId": { $in: [1, 3] },
        "master.branchId": branchId,
        "master.driverId": driver.driverId,
      }).sort({ _id: -1 });

      if (busyOrders.length >= orderDriversLimit || busyOrders.length == 0) {
        continue;
      }

      // Get the last order & check the distance between its customer & the new customer
      const lastOrder = busyOrders[busyOrders.length - 1];

      const { status: distanceCalcStatus, estimatedDistance: estimatedCustomersDistance } = await getEstimatedDistanceDuration({
        pickupLng: lastOrder?.master?.receiverLocation?.coordinates[0],
        pickupLat: lastOrder?.master?.receiverLocation?.coordinates[1],
        dropoffLng: orderSearch?.master?.receiverLocation?.coordinates[0],
        dropoffLat: orderSearch?.master?.receiverLocation?.coordinates[1],
      });

      if (distanceCalcStatus == true && estimatedCustomersDistance > settings.maxDistanceBetweenCustomers) continue;

      //If the driver was found, add him to the trip driverFound & activeOrderDrivers arrays
      activeOrderDrivers.set(orderId, [...(activeOrderDrivers.get(orderId) || []), driver.driverId]);

      return { status: true, driverId: driver.driverId };
    }
    /******************************************************/
    return { status: false, message: "No drivers on way found" };

    /******************************************************/
  } catch (e) {
    Sentry.captureException(e);

    console.log(`Error in checkDriverOnWay() method: ${e.message}`);
    return {
      status: false,
      message: `Error in checkDriverOnWay() method: ${e.message}`,
    };
  }
};
