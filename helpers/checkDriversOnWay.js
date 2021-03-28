const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const { activeOrderDrivers } = require("../globals");

module.exports = async ({ branchId, orderId }) => {
  try {
    const orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    let driversIds = orderSearch.driversFound.map((d) => d.driverId);

    let searchDrivers = await DriverModel.find({
      driverId: { $nin: driversIds },
      // "busyOrders.1": { $exists: false },
      // "busyOrders.branchId": branchId,
    });

    if (searchDrivers.length == 0) {
      return { status: false };
    }

    return { status: true, drivers: searchDrivers };
  } catch (e) {
    console.log(`Error in checkDriversOnWay() method: ${e.message}`);
    return {
      status: false,
      message: `Error in checkDriversOnWay() method: ${e.message}`,
    };
  }
};
