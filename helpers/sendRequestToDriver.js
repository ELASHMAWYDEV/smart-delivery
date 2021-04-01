const DeliverySettingsModel = require("../models/DeliverySettings");
const OrderModel = require("../models/Order");
const {
  drivers,
  ordersInterval,
  activeOrders,
  activeOrderDrivers,
} = require("../globals");
const { io } = require("../index");
const DriverModel = require("../models/Driver");

//Helpers
const sendNotification = require("./sendNotification");
const updateOrderStatus = require("./updateOrderStatus");
const sendRequestToDriver = require("./sendRequestToDriver");
const checkDriverOnWay = require("./checkDriverOnWay");
const findNearestDriver = require("./findNearestDriver");

module.exports = async ({ driver, orderId }) => {
  try {
    // //Get the trip data from ordersInterval map
    if (!ordersInterval.has(orderId)) {
      return io.to(drivers.get(driver.driverId)).emit("NewOrderRequest", {
        status: false,
        message: "Couldn't find the trip in ordersInterval",
      });
    }
    /**************************************************************/

    let { timeoutFunction } = ordersInterval.get(orderId);

    /**************************************************************/
    //Clear the timeoutFunction
    clearTimeout(timeoutFunction);

    console.log("sending to driver:", driver.driverId);
    //Get timerSeconds from settings
    let timerSeconds;
    const settings = await DeliverySettingsModel.findOne({});
    if (settings && settings.timerSeconds) timerSeconds = settings.timerSeconds;

    //Add the driver to the driversFound[] in order
    await OrderModel.updateOne(
      { "master.orderId": orderId },
      {
        $set: {
          "master.driverId": driver.driverId,
          "master.statuId": 1,
        },
        $push: {
          driversFound: {
            _id: driver._id,
            driverId: driver.driverId,
            requestStatus: 4, // 4 => noCatch (default), 1 => accept, 2 => ignore, 3 => reject
            location: driver.location,
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
      { driverId: driver.driverId },
      {
        isBusy: true,
      }
    );

    /******************************************************/
    let { master } = orderSearch;

    /******************************************************/
    //Send notification to the driver
    await sendNotification({
      firebaseToken: driver.firebaseToken,
      title: "You have a new order request, Hurry up !",
      body: `Order #${master.orderId} has been sent to you by ${master.branchNameEn}`,
      type: "1",
      deviceType: +driver.deviceType, // + To Number
    });

    /******************************************************/

    //Send a request to the driver
    io.to(drivers.get(parseInt(driver.driverId))).emit("NewOrderRequest", {
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
      //Check if the trip was accepted by any driver
      let orderSearch = await OrderModel.findOne({
        "master.orderId": orderId,
        "master.statusId": 1,
      });

      if (orderSearch && !activeOrders.has(orderId)) {
        //Check if any driver on the way to this restaurant
        let driverOnWay = await checkDriverOnWay({
          branchId: orderSearch.master.branchId,
          orderId: orderSearch.master.orderId,
        });

        //Send request to driverOnWay
        if (driverOnWay.status) {
          let { driver } = driverOnWay;
          const result = await sendRequestToDriver({
            driver,
            orderId: orderSearch.master.orderId,
          });

          //Continue if order was sent to the driver
          if (result.status) {
            console.log(
              `Order ${orderSearch.master.orderId} was sent to driver ${driver.driverId} on way after no action`
            );
            return;
          }
        }

        /******************************************************/

        //Find nearest driver & send request to him
        let nearestDriverResult = await findNearestDriver({
          orderId: orderSearch.master.orderId,
        });

        if (nearestDriverResult.status) {
          //Send the request to driver
          const result = await sendRequestToDriver({
            driver: nearestDriverResult.driver,
            orderId: orderSearch.master.orderId,
          });

          //Continue if order was sent to the driver
          if (result.status) {
            console.log(
              `Order ${orderSearch.master.orderId} was sent to driver ${nearestDriverResult.driver.driverId}  after no action`
            );
            return;
          }
        }
        /******************************************************/

        console.log(`Order ${orderSearch.master.orderId}, no drivers found`);
        //Set the order to not found
        await updateOrderStatus({
          orderId: orderSearch.master.orderId,
          statusId: 2,
        });

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
      }
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
      order: orderSearch,
    };
    /******************************************************/
  } catch (e) {
    console.log(`Error in sendRequetToDriver() method: ${e.message}`, e);

    return {
      status: false,
      message: `Error in sendRequetToDriver() method: ${e.message}`,
    };
  }
};
