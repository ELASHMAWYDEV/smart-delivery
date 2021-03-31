const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const DeliverySettingsModel = require("../models/DeliverySettings");
const { activeOrderDrivers } = require("../globals");

module.exports = async ({ location, orderId }) => {
  try {
    //Get global intervals
    let maxDistance;
    const settings = await DeliverySettingsModel.findOne({});
    if (settings && settings.globalIntervals) {
      maxDistance = settings.globalIntervals[0].maxDistance || 10000;
    }

    const orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    // let driversIds = orderSearch.driversFound.map((d) => d.driverId);

    let driversIds = activeOrderDrivers.get(orderId);

    console.log("driversIds:", driversIds);

    let driverSearch = await DriverModel.findOne({
      isOnline: true,
      isDeleted: false,
      isBusy: false,
      driverId: { $nin: driversIds },
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [
              orderSearch.master.branchLocation.coordinates[0],
              orderSearch.master.branchLocation.coordinates[1],
            ],
          },
        },
      },
    });

    //If no driver found , send message to client
    if (!driverSearch) {
      return { status: false, message: "No drivers found" };
    }

    //If the driver was found, add him to the trip driverFound & activeOrderDrivers arrays
    activeOrderDrivers.set(orderId, [
      ...(activeOrderDrivers.get(orderId) || []),
      driverSearch.driverId,
    ]);

    /******************************************************/

    return { status: true, driver: driverSearch };

    /******************************************************/
  } catch (e) {
    console.log(`Error in findNearestDriver()`, e);
    return {
      status: false,
      message: `Error in findNearestDriver(): ${e.message}`,
    };
  }
};
