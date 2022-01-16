const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");
const { io } = require("../");
const { drivers } = require("../globals");

module.exports = async ({ driverId }) => {
  // Check if this driver has any orders with status [3, 4]
  const ordersSearch = await OrderModel.find({ "master.driverId": driverId, "master.statusId": { $in: [3, 4] } });

  const acceptedOrders = ordersSearch.filter((order) => order.statusId == 3);
  const receivedOrders = ordersSearch.filter((order) => order.statusId == 4);

  if (acceptedOrders.length == 0) {
    io.to(drivers.get(driverId)).emit("RemoveDialogueWithType", {
      status: true,
      message: "No accepted orders found, removing dialouge",
      type: "receiveDialogue",
    });
  }

  if (receivedOrders.length == 0) {
    io.to(drivers.get(driverId)).emit("RemoveDialogueWithType", {
      status: true,
      message: "No received orders found, removing dialouge",
      type: "deliverDialogue",
    });
  }
};
