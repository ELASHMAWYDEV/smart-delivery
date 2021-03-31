const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const { activeOrderDrivers } = require("../globals");

module.exports = async ({ branchId, orderId }) => {
  try {
    const orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    let driversIds = orderSearch.driversFound.map((d) => d.driverId);

    let driverSearch = await DriverModel.findOne({
      isOnline: true,
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

    if (busyOrders > 1) {
      return { status: false, message: "No drivers found" };
    }

    /******************************************************/

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
