const Sentry = require("@sentry/node");
//Globals
let { drivers, disconnectInterval } = require("../globals");

//Models
const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");

//Helpers
const sendNotification = require("./sendNotification");
// const getLanguage = require("./getLanguage");

module.exports = async ({ driverId }) => {
  try {
    driverId = parseInt(driverId);
    disconnectInterval.set(driverId, { count: 1 });
    let count = disconnectInterval.get(driverId).count;

    const intervalFunction = async () => {
      //Get the driver from db
      const driverSearch = await DriverModel.findOne({ driverId });

      //Check if the driver is connected again or the messages ended or driver put him self offline
      if (count == 4) {
        //Check if he is has any busy orders or not
        let busyOrders = await OrderModel.countDocuments({
          "master.statusId": { $in: [3, 4] },
          "master.driverId": driverId,
        });

        if (busyOrders == 0) {
          await DriverModel.updateOne({ driverId }, { isOnline: false });
          disconnectInterval.delete(driverId);
        }
        clearInterval(interval);
        return;
      }

      if (
        drivers.has(driverId) ||
        !disconnectInterval.has(driverId) ||
        driverSearch.isOnline == false
      ) {
        disconnectInterval.delete(driverId);
        clearInterval(interval);
        return;
      }

      console.log(
        `Sending notification ${count} to driver: ${driverId} after disconnect`,
        disconnectInterval
      );

      //Send notification to driver
      await sendNotification({
        firebaseToken: driverSearch.firebaseToken,
        title: count <= 3 ? "You are still online" : "You are offline now",
        body:
          "You have closed the application but you can still receive new orders",
        type: "3",
        deviceType: +driverSearch.deviceType, // + To Number
      });

      count++;
      disconnectInterval.set(driverId, { count });
    };

    let interval = setInterval(() => {
      intervalFunction();
    }, 4 * 60 * 1000);
    //Call the func immediateley
    intervalFunction();
  } catch (e) {
    Sentry.captureException(e);
    console.log(`Error in disconnectDriver(), error: ${e.message}`);
  }
};
