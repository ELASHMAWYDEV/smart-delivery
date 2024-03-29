const mongoose = require("mongoose");
const { Number, Boolean, String } = mongoose.Schema.Types;
const { driverTypes } = require("./constants");

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
  driverType: {
    type: String,
    enum: Object.values(driverTypes),
    required: true,
  },
  categoryCarTypeId: {
    type: Number,
  },
  isDeleted: {
    type: Boolean,
    default: true,
  },
  isActivated: {
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
  companyId: {
    type: Number,
  },
  isCompany: {
    type: Boolean,
  },
  onlineBeforeDisconnect: {
    type: Boolean,
  },
  disconnectTime: {
    type: Date,
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  suspendedUntil: {
    type: Date,
  },
});

const Driver = mongoose.model("Driver", driverSchema, "drivers");
module.exports = Driver;
