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
  maxDistanceBetweenCustomers: {
    type: Number,
    default: 10,
  },
});

const DeliverySettings = mongoose.model("DeliverySettings", deliverySettingsSchema, "deliverySettings");
module.exports = DeliverySettings;
