const Sentry = require("@sentry/node");
const axios = require("axios");
const OrderModel = require("../models/Order");

const { API_URI } = require("../globals");

module.exports = async ({ branchId, token }) => {
  try {
    //Send to the API
    let response = await axios.post(
      `${API_URI}/Trip/ReceiveOrder?branchId=${branchId}`,
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

    /*************************************************************/
    //Get the list of order Ids from response
    let ordersIds = [];

    for (let order of apiData.trips) {
      ordersIds.push(order.orderId);
    }

    /*************************************************************/
    //Update the orders on DB
    await OrderModel.updateMany(
      {
        "master.orderId": { $in: ordersIds },
        "master.statusId": { $nin: [2, 6] }, //To prevent cancel conflict
      },
      {
        "master.statusId": 4, //Received
      }
    );

    //Get the orders that really were canceled
    const ordersSearch = await OrderModel.find({
      "master.orderId": { $in: [ordersIds] },
      "master.statusId": 4,
    });

    //Update the orderIds
    ordersIds = ordersSearch.map((order) => order.master.order);

    return {
      status: true,
      message: "Orders status updated successefully",
      ordersIds,
    };

    /******************************************************/
  } catch (e) {
    Sentry.captureException(e);

    console.log(`Error in receiveOrder(): ${e.message}`);

    return {
      status: false,
      message: `Error in receiveOrder(): ${e.message}`,
    };
  }
};
