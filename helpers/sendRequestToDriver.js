const Sentry = require("@sentry/node");
const DeliverySettingsModel = require("../models/DeliverySettings");
const OrderModel = require("../models/Order");
const DriverModel = require("../models/Driver");
const { drivers, ordersInterval } = require("../globals");
const { io } = require("../index");

//Helpers
const sendNotification = require("./sendNotification");

const sendRequestToDriver = async ({ driverId, orderId }) => {
  try {
    driverId = parseInt(driverId);

    //Get the trip data from ordersInterval map
    if (!ordersInterval.has(orderId)) {
      return io.to(drivers.get(driverId)).emit("NewOrderRequest", {
        status: false,
        message: `Sorry you couldn't catch the order, Error Code: 59`,
      });
    }
    /**************************************************************/
    //Get the driver again
    let driverSearch = await DriverModel.findOne({ driverId });

    if (!driverSearch) {
      Sentry.captureMessage(
        `Couldn't send request to driver: #${driver.driverId}`
      );
      return {
        status: false,
        message: `Couldn't send request to driver: #${driver.driverId}`,
      };
    }

    /**************************************************************/

    //Clear last timeout of the order if exist
    let { timeoutFunction } = ordersInterval.get(orderId) || {};

    if (timeoutFunction) {
      clearTimeout(timeoutFunction);
    }
    /**************************************************************/

    //Get timerSeconds from settings
    let timerSeconds;
    const settings = await DeliverySettingsModel.findOne({});
    if (settings && settings.timerSeconds) timerSeconds = settings.timerSeconds;

    //Add the driver to the driversFound[] in order
    await OrderModel.updateOne(
      { "master.orderId": orderId },
      {
        $set: {
          "master.driverId": driverSearch.driverId,
          "master.statuId": 1,
        },
        $push: {
          driversFound: {
            _id: driverSearch._id,
            driverId: driverSearch.driverId,
            requestStatus: 4, // 4 => noCatch (default), 1 => accept, 2 => ignore, 3 => reject
            location: driverSearch.location,
            actionDate: new Date().constructor({
              timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
            }),
            timeSent: new Date().getTime(),
          },
        },
      }
    );

    /******************************************************/
    //Get the order after update
    let orderSearch = await OrderModel.findOne({ "master.orderId": orderId });
    orderSearch = orderSearch && orderSearch.toObject();

    /******************************************************/
    //Set the driver to be busy
    await DriverModel.updateOne(
      { driverId: driverSearch.driverId },
      {
        isBusy: true,
      }
    );

    /******************************************************/
    let { master } = orderSearch;

    /******************************************************/
    //Send notification to the driver
    await sendNotification({
      firebaseToken: driverSearch.firebaseToken,
      title: "You have a new order request, Hurry up !",
      body: `Order #${master.orderId} has been sent to you by ${master.branchNameEn}`,
      type: "1",
      deviceType: +driverSearch.deviceType, // + To Number
      data: { orderId: master.orderId.toString() },
    });

    /******************************************************/
    //Send a request to the driver
    io.to(drivers.get(driverId)).emit("NewOrderRequest", {
      status: true,
      message: "You have a new order request",
      timerSeconds,
      order: {
        orderId: master.orderId,
        branchId: master.branchId,
        branchNameAr: master.branchNameAr,
        branchNameEn: master.branchNameEn,
        branchAddress: master.branchAddress,
        receiverAddress: master.receiverAddress,
        receiverDistance: master.receiverDistance,
        branchLogo: master.branchLogo,
        paymentTypeEn: master.paymentTypeEn,
        paymentTypeAr: master.paymentTypeAr,
        deliveryPriceEn: master.deliveryPriceEn,
        deliveryPriceAr: master.deliveryPriceAr,
        branchLocation: {
          lng: master.branchLocation.coordinates[0],
          lat: master.branchLocation.coordinates[1],
        },
      },
    });

    /***********************************************************/
    /*
     *
     *
     *
     *
     * START the timeout function
     * It should perform action if the driver didn't take any
     *
     *
     *
     * */
    /***********************************************************/

    //Set the timeout to be timerSeconds * 2
    timeoutFunction = setTimeout(async () => {
      /***********************************************************/

      const orderCycle = require("./orderCycle");

      //Send the order to the next driver
      const result = await orderCycle({ orderId });
      console.log(result.message);

      /******************************************************/
    }, timerSeconds * 2 * 1000);

    /******************************************************/
    //Add the timeout to ordersInterval
    ordersInterval.set(orderId, {
      ...(ordersInterval.get(orderId) || {}),
      timeoutFunction,
    });

    return {
      status: true,
      message: "request sent successfully",
    };
    /******************************************************/
  } catch (e) {
    Sentry.captureException(e);

    console.log(`Error in sendRequetToDriver() method: ${e.message}`, e);

    return {
      status: false,
      message: `Error in sendRequetToDriver() method: ${e.message}`,
    };
  }
};

module.exports = sendRequestToDriver;
