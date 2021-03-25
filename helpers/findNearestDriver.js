const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const { activeOrderDrivers } = require("../globals");

module.exports = async ({ location, orderId }) => {
  try {
    const orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    let driversIds = orderSearch.driversFound.map((d) => d.driverId);

    let driverSearch = await DriverModel.findOne({
      isOnline: true,
      isDeleted: false,
      isBusy: false,
      driverId: { $nin: driversIds },
      "busyOrders.1": { $exists: false },
      "busyOrders.orderId": { $ne: orderId },
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [location.coordinates[0], location.coordinates[1]],
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
      ...activeOrderDrivers.get(orderId),
      driverSearch.driverId,
    ]);

    /******************************************************/

    if (driverSearch) {
      return { status: true, driver: driverSearch };
    } else {
      //Update the order status
      await OrderModel.updateOne(
        {
          "master.orderId": orderId,
        },
        { "master.statusId": 2 } //Not Found
      );
      return { status: false, message: "No drivers found" };
    }

    /******************************************************/
  } catch (e) {
    console.log(`Error in findNearestDriver()`, e);
    return {
      status: false,
      message: `Error in findNearestDriver(): ${e.message}`,
    };
  }
};
