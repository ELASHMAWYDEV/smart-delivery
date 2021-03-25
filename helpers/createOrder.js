const axios = require("axios");
const { API_URI } = require("../globals");
const OrderModel = require("../models/Order");

module.exports = async ({ token, orders }) => {
  try {
    // receiverName,
    // receiverMobile,
    // receiverAddress,
    // receiverLocation,
    // receiverCollected,
    // branchId,
    // isPaid,
    // storeCost,
    // discount,
    // tax,
    // deliveryCost,
    // items,

    /*************************************************/
    //Send to the api
    let response = await axios.post(
      `${API_URI}/Trip/MultiNewTrip`,
      { orders },
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

    /*  @response
        {
          "message": "The Trip was created successfully",
          "status": true,
          "isAuthorize": true,
          "data": [{
            "tripId": 6,
            "branchId": 2,
            "branchLat": 30.611838,
            "branchLng": 32.292009,
            "branchNameAr": "كنتاكى",
            "branchNameEn": "KFC",
            "receiveraddress": "Ismailia ElSheikh Zayed",
            "receiverLat": 25.126,
            "receiverLng": 30.12,
            "fromReceiver": 70.5,
            "storeCost": 50.25
          }]
        }
        */

    //Transform to be like DB schema
    const ordersToStoreInDB = apiData.map((order) => {
      
      return {
        master: {
          orderId: order.tripId,
          branchId: order.branchId,
          branchNameAr: order.branchNameAr,
          branchNameEn: order.branchNameEn,
          receiverName: order.receiverName,
          receiverMobile: order.receiverMobile,
          receiverAddress: order.receiverAddress,
          isPaid: order.isPaid,
          storeCost: order.storeCost,
          discount: order.discount,
          tax: order.tax,
          deliveryCost: order.deliveryCost,
          receiverLocation: {
            coordinates: [order.receiverLng, order.receiverLat],
          },
          branchLocation: {
            coordinates: [order.branchLng, order.branchLat],
          },
          fromReceiver: order.fromReceiver,
        },
        items: order.items,
      };
    });

    //Save order to DB
    let ordersSave = await OrderModel.insertMany(ordersToStoreInDB);

    return {
      status: true,
      orders: ordersSave,
    };
  } catch (e) {
    console.log(`Error in createOrder() method: ${e.message}`);
    return {
      status: false,
      message: `Error in createOrder() method: ${e.message}`,
    };
  }
};
