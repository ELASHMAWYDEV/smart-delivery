const mongoose = require("mongoose");
const { Number, Boolean, String } = mongoose.Schema.Types;

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

const masterSchema = new mongoose.Schema({
  orderId: Number,
  branchId: Number,
  driverId: { type: Number, default: null },
  branchNameAr: String,
  branchNameEn: String,
  receiverName: String,
  receiverMobile: String,
  receiverAddress: String,
  receiverLocation: {
    type: pointSchema,
    index: "2dsphere",
    required: true,
  },
  branchLocation: {
    type: pointSchema,
    index: "2dsphere",
    required: true,
  },
  storeCost: Number,
  receiverCollected: Number,
  isPaid: Boolean,
  discount: Number,
  tax: Number,
  deliveryCost: Number,
  fromReceiver: Number,
  //1 ==> created, 2 ==> not found, 3 ==> accept, 4 ==> received, 5 ==> delivered
  statusId: { type: Number, default: 1 },
});

const itemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
});

const orderDriversSchema = new mongoose.Schema({
  orderId: {
    type: Number,
  },
  driverId: {
    type: Number,
  },
  requestStatus: {
    // 1 ==> accept, 2 ==> reject, 3 ==> ignore , 4 ==> noCatch, 5 ==> noCatch & seen by notification
    type: Number,
  },
  location: {
    type: pointSchema,
    required: true,
    index: "2dsphere",
  },
  actionDate: {
    type: Date,
  },
  rangeIndex: {
    type: Number,
    default: 1,
  },
  estimatedDriverDistance: {
    type: Number,
    default: 0, //temp
  },
  estimatedDriverDuration: {
    type: Number,
    default: 0, //temp
  },
  timeSent: {
    type: Number,
    default: new Date().getTime(),
  },
  isSeenNoCatch: {
    type: Boolean,
    default: false,
  },
});

const orderSchema = new mongoose.Schema({
  master: masterSchema,
  items: [itemSchema],
  driversFound: {
    type: [orderDriversSchema],
  },
});

const Order = mongoose.model("Order", orderSchema, "orders");
module.exports = Order;
