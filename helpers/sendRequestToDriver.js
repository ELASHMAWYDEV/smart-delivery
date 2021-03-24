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
    const orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

    /******************************************************/

    //Send a request to the driver
    io.to(drivers.get(driver.driverId)).emit("NewOrderRequest", {
      status: true,
      message: "You have a new order request",
      order: orderSearch,
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
