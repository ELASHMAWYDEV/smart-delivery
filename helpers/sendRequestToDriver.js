const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const { drivers } = require("../globals");
const { io } = require("../index");

module.exports = async ({ driver, orderId }) => {
  try {
    //Add the driver to the driversFound[] in order
    await OrderModel.updateOne(
      { "master.orderId": orderId },
      {
        $set: {
          "master.driverId": driver.driverId,
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
    let { master } = orderSearch;

    //Send a request to the driver
    io.to(drivers.get(parseInt(driver.driverId))).emit("NewOrderRequest", {
      status: true,
      message: "You have a new order request",
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
      timerSeconds: 15, //Temporary
    });

    return {
      status: true,
      message: "request sent successfully",
      order: orderSearch,
    };
    /******************************************************/
  } catch (e) {
    console.log(`Error in sendRequetToDrivers() method: ${e.message}`);

    return {
      status: false,
      message: `Error in sendRequetToDrivers endpoint: ${e.message}`,
    };
  }
};
