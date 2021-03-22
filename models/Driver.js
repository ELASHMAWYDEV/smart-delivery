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

const busyOrderSchema = new mongoose.Schema({
  _id: { ref: "Order", type: ObjectId },
  orderId: Number,
  branchId: Number,
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
  busyOrders: {
    type: [busyOrderSchema],
    default: [],
  },
  deviceType: {
    type: Number,
  },
  location: {
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
});

const Driver = mongoose.model("Driver", driverSchema, "drivers");
module.exports = Driver;
