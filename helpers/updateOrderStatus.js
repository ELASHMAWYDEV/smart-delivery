const axios = require("axios");
const DriverModel = require("../models/Driver");
const OrderModel = require("../models/Order");

const { API_URI, API_SECRET_KEY } = require("../globals");

module.exports = async ({ statusId, orderId, token }) => {
  try {
    orderId = parseInt(orderId);

    //Get the list of drivers found for this order
    let orderSearch = await OrderModel.findOne({ "master.orderId": orderId });
    orderSearch = orderSearch && orderSearch.toObject();

    //Update to the API
    let response = await axios.post(
      `${API_URI}/Trip/UpdateOrder`,
      {
        orderId,
        orderStatusId: statusId,
        orderDrivers: orderSearch.driversFound,
      },
      {
        headers: {
          Authorization: `Bearer ${API_SECRET_KEY}`,
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

    console.log(apiData);
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
