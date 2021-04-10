const Sentry = require("@sentry/node");
const { Mutex } = require("async-mutex");
const mutex = new Mutex();
const OrderModel = require("../models/Order");
const DriverModel = require("../models/Driver");
const { ordersInterval, activeOrderDrivers } = require("../globals");

//Helpers
const checkDriverOnWay = require("./checkDriverOnWay");
const sendRequestToDriver = require("./sendRequestToDriver");
const findNearestDriver = require("./findNearestDriver");
const updateOrderStatus = require("./updateOrderStatus");

const orderCycle = async ({
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

  try {
    orderId = parseInt(orderId);
    //Put the order at the ordersInterval map
    if (!ordersInterval.has(orderId))
      ordersInterval.set(orderId, {
        timeoutFunction: setTimeout(() => null, 0),
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
      let { timeoutFunction } = ordersInterval.get(orderId) || {};

      //Clear all order intervals
      if (timeoutFunction) {
        clearTimeout(timeoutFunction);
      }
      activeOrderDrivers.delete(orderId);
      ordersInterval.delete(orderId);
      return {
        status: false,
        message: `Order ${orderId} has changed from created to another status`,
      };
    }
    /************************************/

    //Check if last driver has any busy orders
    if (orderSearch.master.driverId) {
      //Remove the driver from the order
      await OrderModel.updateOne(
        {
          "master.orderId": orderId,
        },
        {
          $set: {
            "master.driverId": null,
          },
        }
      );

      const busyOrders = await OrderModel.countDocuments({
        "master.statusId": { $in: [1, 3, 4] },
        "master.driverId": orderSearch.master.driverId,
      });

      //Set the driver busy or not
      await DriverModel.updateOne(
        {
          driverId: orderSearch.master.driverId,
        },
        {
          isBusy: busyOrders > 0 ? true : false,
        }
      );
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
        orderId: orderSearch.master.orderId,
      });

      //Continue if order was sent to the driver
      if (result.status) {
        return {
          status: true,
          message: `Order ${orderSearch.master.orderId} was sent to driver ${driverId} on way`,
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
        orderId: orderSearch.master.orderId,
      });

      //Continue if order was sent to the driver
      if (result.status) {
        return {
          status: true,
          message: `Order ${orderSearch.master.orderId} was sent to driver ${driverId}`,
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
    let { timeoutFunction } = ordersInterval.get(orderId) || {};

    //Clear all order intervals
    if (timeoutFunction) {
      clearTimeout(timeoutFunction);
    }
    activeOrderDrivers.delete(orderId);
    ordersInterval.delete(orderId);

    /********************************************************/
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
    release();
  }
};

module.exports = orderCycle;
