const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const { activeOrderDrivers } = require("../globals");

module.exports = async ({ branchId, orderId }) => {
  try {
    const orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    // let driversIds = orderSearch.driversFound.map((d) => d.driverId);

    let driversIds = activeOrderDrivers.get(orderId);

    let driverSearch = await DriverModel.findOne({
      isOnline: true,
      isBusy: true,
      isDeleted: false,
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
      return { status: false, message: "No drivers on way found" };
    }

    /******************************************************/

    //Check driver has how many orders
    const busyOrders = await OrderModel.countDocuments({
      "master.statusId": { $in: [1, 3] },
      "master.branchId": branchId,
      "master.driverId": driverSearch.driverId,
    });

    console.log("busyOrders:", busyOrders, "driver:", driverSearch.driverId);
    if (busyOrders >= 2) {
      return { status: false, message: "No drivers found" };
    }

    /******************************************************/

    //If the driver was found, add him to the trip driverFound & activeOrderDrivers arrays
    activeOrderDrivers.set(orderId, [
      ...activeOrderDrivers.get(orderId),
      driverSearch.driverId,
    ]);

    return { status: true, driver: driverSearch };

    /******************************************************/
  } catch (e) {
    console.log(`Error in checkDriverOnWay() method: ${e.message}`);
    return {
      status: false,
      message: `Error in checkDriverOnWay() method: ${e.message}`,
    };
  }
};
