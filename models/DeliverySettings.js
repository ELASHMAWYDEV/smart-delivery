const mongoose = require("mongoose");

const deliverySettingsSchema = new mongoose.Schema({
  timerSeconds: {
    type: Number,
    default: 15,
  },
  maxDistance: {
    type: Number,
    default: 20,
  },
  suspendDriverAfter: {
    // To suspend the driver from making orders if he rejected {ordersCount} in the last {minutes} mins
    type: {
      minutes: Number,
      ordersCount: Number,
      suspendDuration: Number,
    },
    required: true,
    default: {
      minutes: 60,
      ordersCount: 4,
      suspendDuration: 30, //minutes
    },
  },
});

const DeliverySettings = mongoose.model("DeliverySettings", deliverySettingsSchema, "deliverySettings");
module.exports = DeliverySettings;
