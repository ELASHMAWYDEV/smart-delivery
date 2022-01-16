const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const SettingsModel = require("../models/DeliverySettings");
const geoDistance = require("geo-distance");
const sendNotification = require("./sendNotification");

let settings;

(async () => {
  settings = await SettingsModel.findOne({});
})();

module.exports = async ({ driverId }) => {
  // Check if this driver has any orders with status [3, 4]
  const ordersSearch = await OrderModel.find({ "master.driverId": driverId, "master.statusId": { $in: [3, 4] } });

  if (ordersSearch.length == 0) return;

  // Get the driver
  const driverSearch = await DriverModel.findOne({ driverId });

  const acceptedOrders = ordersSearch.filter((order) => order.statusId == 3);
  const receivedOrders = ordersSearch.filter((order) => order.statusId == 4);

  if (acceptedOrders.length > 0) {
    // Check branch area
    const branchDistance = geoDistance.between(
      {
        lon: acceptedOrders[0].master.branchLocation.coordinates[0],
        lat: acceptedOrders[0].master.branchLocation.coordinates[1],
      },
      {
        lon: driverSearch.location.coordinates[0],
        lat: driverSearch.location.coordinates[1],
      }
    );
    if (branchDistance <= geoDistance(settings.notifyDriverDistance.branch, "m")) {
      sendNotification({
        firebaseToken: driverSearch.firebaseToken,
        title: `Have you received the orders already ?`,
        body: `If you have received the order from ${acceptedOrders[0].master.branchNameEn}, please click on the Receive Order button`,
        type: "7",
        deviceType: +driverSearch.deviceType, // + To Number
        data: {
          message: `Have you received all the order from ${acceptedOrders[0].master.branchNameEn}`,
          branchId: acceptedOrders[0].master.branchId,
        },
      });
    }
  } else if (receivedOrders.length > 0) {
    for (const order of receivedOrders) {
      // Check customer area
      const customerDistance = geoDistance.between(
        {
          lon: order.master.receiverLocation.coordinates[0],
          lat: order.master.receiverLocation.coordinates[1],
        },
        {
          lon: driverSearch.location.coordinates[0],
          lat: driverSearch.location.coordinates[1],
        }
      );
      if (customerDistance <= geoDistance(settings.notifyDriverDistance.customer, "m")) {
        sendNotification({
          firebaseToken: driverSearch.firebaseToken,
          title: `Have you delivered the order already ?`,
          body: `If you have delivered the order to ${order.master.receiverName}, please click on the Deliver Order button`,
          type: "7",
          deviceType: +driverSearch.deviceType, // + To Number
          data: {
            message: `Have you delivered order #${order.master.orderId} to ${order.master.receiverName} ?`,
            orderId: order.master.orderId,
          },
        });
      }
    }
  }
};
