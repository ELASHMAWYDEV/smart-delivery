const axios = require("axios");
const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");

const { API_URI } = require("../globals");

module.exports = async ({ statusId, orderId, token }) => {
  try {
    //Get the list of drivers found for this order
    let orderSearch = await OrderModel.findOne({ "master.orderId": orderId });
    orderSearch = orderSearch && orderSearch.toObject();

    //Update to the API
    let response = await axios.post(
      `${API_URI}/Trip/UpdateTrip`,
      {
        tripID: orderId,
        tripStatusID: statusId,
        cancelReasonID: 0, //temp
        tripDrivers: orderSearch.driversFound,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    let data = await response.data;

    if (!data.isAuthorize || !data.status) {
      return {
        status: false,
        isAuthorize: data.isAuthorize,
        message: data.message,
      };
    }

    let { data: apiData } = data;

    return {
      status: true,
      message: "Order status updated successefully",
      data: apiData,
    };

    /******************************************************/
  } catch (e) {
    console.log(`Error in updateOrderStatus(): ${e.message}`);

    return {
      status: false,
      message: `Error in updateOrderStatus(): ${e.message}`,
    };
  }
};
