const mongoose = require("mongoose");

const globalIntervalSchema = new mongoose.Schema({
  index: Number,
  maxDistance: Number,
});

const deliverySettingsSchema = new mongoose.Schema({
  timerSeconds: {
    type: Number,
    default: 15,
  },
  globalIntervals: {
    type: [globalIntervalSchema],
  },
});



const DeliverySettings = mongoose.model("DeliverySettings", deliverySettingsSchema, "deliverySettings");
module.exports = DeliverySettings;

