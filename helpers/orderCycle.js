const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");
const mutex = new Mutex();
const OrderModel = require("../models/Order");
const DriverModel = require("../models/Driver");
const {
  activeOrders,
  activeOrderDrivers,
  busyDrivers,
  orderCycleDrivers,
} = require("../globals");

//Helpers
const checkDriverOnWay = require("./checkDriverOnWay");
const sendRequestToDriver = require("./sendRequestToDriver");
const findNearestDriver = require("./findNearestDriver");
const updateOrderStatus = require("./updateOrderStatus");

const orderCycle = async ({
  driverIdSentFrom = null,
  orderId,
  driversIds = [],
  orderDriversLimit = 2,
}) => {
  /*
   *
   *
   * @@@@@WARNING@@@@
   *   Mutext is BLOCKING code execution here
   *   Make sure to RELEASE in finally
   * @@@@@WARNING@@@@
   *
   *
   * */

  const release = await mutex.acquire(); //Block code execution for sequentially placing orders
  orderId = parseInt(orderId);

  try {
    /************************************/
    //Check if driver didn't send the cycle before
    if (orderCycleDrivers.has(orderId)) {
      if (
        driverIdSentFrom &&
        orderCycleDrivers.get(orderId).includes(driverIdSentFrom)
      ) {
        console.log(
          `Tried to trigger cycle twice, but lock prevented it for order ${orderId}, driver ${driverIdSentFrom}`
        );
        return {
          status: true,
          message: `Tried to trigger cycle twice, but lock prevented it for order ${orderId}, driver ${driverIdSentFrom}`,
        };
      }
    }

    //Add driver to memory
    if (driverIdSentFrom) {
      orderCycleDrivers.set(orderId, [
        ...new Set([
          ...(orderCycleDrivers.get(orderId) || []),
          driverIdSentFrom,
        ]),
      ]);
    }

    /************************************/
    //Put the order at the activeOrders map
    if (!activeOrders.has(orderId))
      activeOrders.set(orderId, {
        timeoutFunction: setTimeout(() => null, 0),
        driversIds,
        orderDriversLimit,
      });

    //Init the activeOrderDrivers array if not initialized
    if (!activeOrderDrivers.has(orderId)) activeOrderDrivers.set(orderId, []);

    //Check if the trip was accepted by any driver
    let orderSearch = await OrderModel.findOne({
      "master.orderId": orderId,
      "master.statusId": 1,
    });

    if (!orderSearch) {
      //Clear all intervals in memory related to this orders
      let { timeoutFunction } = activeOrders.get(orderId) || {};

      //Clear all order intervals
      if (timeoutFunction) {
        clearTimeout(timeoutFunction);
      }
      activeOrderDrivers.delete(orderId);
      activeOrders.delete(orderId);
      console.log(
        `Order ${orderId} has changed from created to another status`
      );
      return {
        status: false,
        message: `Order ${orderId} has changed from created to another status`,
      };
    }

    /************************************/

    //Check if any driver on the way to this restaurant
    let driverOnWay = await checkDriverOnWay({
      branchId: orderSearch.master.branchId,
      orderId: orderSearch.master.orderId,
      driversIds,
      orderDriversLimit,
    });

    //Send request to driverOnWay
    if (driverOnWay.status) {
      let { driverId } = driverOnWay;
      let result = await sendRequestToDriver({
        driverId,
        order: orderSearch,
        driversIds,
        orderDriversLimit,
      });

      //Continue if order was sent to the driver
      if (result.status) {
        console.log(result.message);
        return {
          status: true,
          message: result.message,
        };
      }
    }

    /******************************************************/

    //Find nearest driver & send request to him
    let nearestDriverResult = await findNearestDriver({
      orderId: orderSearch.master.orderId,
      driversIds,
    });

    if (nearestDriverResult.status) {
      let { driverId } = nearestDriverResult;

      //Send the request to driver
      const result = await sendRequestToDriver({
        driverId,
        order: orderSearch,
        driversIds,
        orderDriversLimit,
      });

      //Continue if order was sent to the driver
      if (result.status) {
        console.log(result.message);
        return {
          status: true,
          message: result.message,
        };
      }
    }
    /******************************************************/

    //Set the order to not found
    const result = await updateOrderStatus({
      orderId: orderSearch.master.orderId,
      statusId: 2,
    });

    if (!result.status) {
      Sentry.captureMessage(result.message);
      return result;
    }
    //Update the order
    await OrderModel.updateOne(
      {
        "master.orderId": orderSearch.master.orderId,
      },
      {
        $set: {
          "master.statusId": 2, //Not found
          "master.driverId": null,
        },
      }
    );

    /********************************************************/
    //Clear all intervals in memory related to this orders
    let { timeoutFunction } = activeOrders.get(orderId) || {};

    //Clear all order intervals
    if (timeoutFunction) {
      clearTimeout(timeoutFunction);
    }
    activeOrderDrivers.delete(orderId);
    activeOrders.delete(orderId);

    /********************************************************/
    console.log(`Order ${orderSearch.master.orderId}, no drivers found`);
    return {
      status: true,
      message: `Order ${orderSearch.master.orderId}, no drivers found`,
    };
    /********************************************************/
  } catch (e) {
    Sentry.captureException(e);
    console.log(`Error in orderCycle(), ${e.message}`);

    return {
      status: false,
      message: `Error in orderCycle(), ${e.message}`,
    };
  } finally {
    orderCycleDrivers.delete(orderId);
    release();
  }
};

module.exports = orderCycle;
