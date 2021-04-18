const Sentry = require("@sentry/node");
const OrderModel = require("../../models/Order");
const { busyDrivers } = require("../../globals");

module.exports = async (driver) => {
  try {
    let { driverId, isBusy, isOnline } = driver || {};

    //Get the ordersIds from memory
    let { busyOrders: ordersIds } = busyDrivers.get(parseInt(driverId)) || {
      busyOrders: [],
    };

    //check if the driver is busy on a trip & get the trip data
    if (isBusy == true && ordersIds.length > 0) {
      //Get the order
      let ordersSearch = await OrderModel.find({
        "master.orderId": { $in: ordersIds },
      });

      //Add the order to the driver object
      driver = { ...driver, orders: ordersSearch };
    }

    /* 
      1 ==> available
      2 ==> busy
      3 ==> offline
    */

    //Put the status of the driver
    let status =
      isOnline && !isBusy
        ? 1
        : isBusy && ordersIds.length > 0
        ? 2
        : !isOnline
        ? 3
        : 1;

    driver = { status, ...driver };

    return {
      status: true,
      driver,
    };
  } catch (e) {
    Sentry.captureException(e);

    console.log(`Error in manipulateDriver, error: ${e.message}`);

    return {
      status: false,
      message: `Error in manipulateDriver, error: ${e.message}`,
    };
  }
};
