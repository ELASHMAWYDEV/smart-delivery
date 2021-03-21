const mongoose = require("mongoose");
const { Number, Boolean, String } = mongoose.Schema.Types;

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
    default: "Point"
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const masterSchema = new mongoose.Schema({
  orderId: Number,
  branchId: Number,
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
});

const itemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
});
const orderSchema = new mongoose.Schema({
  master: masterSchema,
  items: [itemSchema],
});

const Order = mongoose.model("Order", orderSchema, "orders");
module.exports = Order;
