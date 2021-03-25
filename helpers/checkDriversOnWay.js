const DriverModel = require("../models/Driver");

module.exports = async ({ branchId }) => {
  try {
    let searchDrivers = await DriverModel.find({
      "busyOrders.1": { $exists: false },
      "busyOrders.branchId": branchId,
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
