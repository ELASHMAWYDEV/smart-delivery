const mongoose = require("mongoose");
const { Number, Boolean, String, ObjectId } = mongoose.Schema.Types;

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
    default: "Point",
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const driverSchema = new mongoose.Schema({
  driverId: {
    type: Number,
  },
  categoryCarTypeId: {
    type: Number,
  },
  isDeleted: {
    type: Boolean,
    default: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  isBusy: {
    type: Boolean,
    default: false,
  },
  deviceType: {
    type: Number,
  },
  location: {
    type: pointSchema,
    required: true,
    index: "2dsphere",
  },
  oldLocation: {
    type: pointSchema,
    required: true,
    index: "2dsphere",
  },
  phoneNumber: {
    type: Number,
  },
  idNo: {
    type: Number,
  },
  driverNameAr: {
    type: String,
  },
  driverNameEn: {
    type: String,
  },
  modelNameAr: {
    type: String,
  },
  modelNameEn: {
    type: String,
  },
  colorNameAr: {
    type: String,
  },
  colorNameEn: {
    type: String,
  },
  carPicture: {
    type: String,
  },
  driverPicture: {
    type: String,
  },
  plateNumber: {
    type: Number,
  },
  updateLocationDate: {
    type: Date,
  },
  firebaseToken: {
    type: String,
  },
  countryId: {
    type: Number,
  },
  accessToken: {
    type: String,
  },
});

const Driver = mongoose.model("Driver", driverSchema, "drivers");
module.exports = Driver;
