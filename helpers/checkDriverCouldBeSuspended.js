const Sentry = require("@sentry/node");
const dayjs = require("dayjs");
const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const SettingsModel = require("../models/DeliverySettings");
const sendNotification = require("./sendNotification");
const { io } = require("..");
const { drivers } = require("../globals");

let settings;

(async () => {
  settings = await SettingsModel.findOne({});
})();

module.exports = async ({ driverId }) => {
  try {
    // Get the count of orders rejected by this driver in the last {settings.suspendDriverAfter.minutes} mins
    const rejectedOrders = await OrderModel.find({
      driversFound: {
        $elemMatch: {
          driverId,
          requestStatus: 2,
          actionDate: { $gt: dayjs().subtract(settings.suspendDriverAfter.minutes, 'minutes') },
        },
      },
    });

    if (rejectedOrders.length >= settings.suspendDriverAfter.ordersCount) {
      // Suspend the driver & set him offline
      const updatedDriver = await DriverModel.findOneAndUpdate(
        { driverId },
        {
          $set: {
            isSuspended: true,
            isOnline: false,
            suspendedUntil: dayjs(
              rejectedOrders[rejectedOrders.length - 1].driversFound.find((d) => d.driverId == driverId).actionDate
            ).add(settings.suspendDriverAfter.suspendDuration, 'minutes')
            ,
          },
        },
        { new: true }
      );

      //Emit to the driver that he went offline
      io.to(drivers.get(driverId)).emit("GoOnline", {
        status: false,
        isAuthorize: true,
        isOnline: false,
        message: `The driver is set to offline`,
      });

      const timeString = new Date(
        updatedDriver.suspendedUntil
      ).toLocaleTimeString("en-US", { timeZone: "Asia/Bahrain" });

      // Send him a notification
      sendNotification({
        firebaseToken: updatedDriver.firebaseToken,
        title: "You have been banned from receiving any orders",
        body: `You have been banned until ${timeString}. because you have rejected ${rejectedOrders.length} in the last ${settings.suspendDriverAfter.minutes
          } minutes`,
        type: "0",
        deviceType: +updatedDriver.deviceType,
      });
    } else {
      // Check if suspension time passed
      const driverSearch = await DriverModel.findOne({ driverId });

      if (new Date(driverSearch.suspendedUntil) <= new Date()) {
        //update the driver isSuspended = false
        await DriverModel.updateOne({ driverId }, { $set: { isSuspended: false, suspendedUntil: null } });
      }
    }
  } catch (e) {
    Sentry.captureException(e);

    console.log(`Error in checkDriverCouldBeSuspended()`, e);
    return {
      status: false,
      message: `Error in checkDriverCouldBeSuspended(): ${e.message}`,
    };
  }
};
