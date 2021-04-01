const axios = require("axios");
const OrderModel = require("../models/Order");

const { API_URI } = require("../globals");

module.exports = async ({ orderId, lng, lat, token }) => {
  try {
    //Send to the API
    let response = await axios.post(
      `${API_URI}/Trip/FinishOrder?orderId=${orderId}&lat=${lat}&lng=${lng}`,
      {},
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

    //Update the orders on DB
    await OrderModel.updateMany(
      {
        "master.orderId": orderId,
      },
      {
        "master.statusId": 5, //Delivered
      }
    );

    return {
      status: true,
      message: "Orders status updated successefully",
    };

    /******************************************************/
  } catch (e) {
    console.log(`Error in deliverOrder(): ${e.message}`);

    return {
      status: false,
      message: `Error in deliverOrder(): ${e.message}`,
    };
  }
};
