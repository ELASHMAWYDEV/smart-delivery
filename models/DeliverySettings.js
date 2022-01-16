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
  notifyDriverDistance: {
    type: {
      branch: Number,
      customer: Number,
    },
    default: {
      branch: 500, //m
      customer: 300, //m
    },
  },
});

const DeliverySettings = mongoose.model("DeliverySettings", deliverySettingsSchema, "deliverySettings");
module.exports = DeliverySettings;
