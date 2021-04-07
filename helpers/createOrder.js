const axios = require("axios");
const { API_URI } = require("../globals");
const OrderModel = require("../models/Order");

module.exports = async ({ token, orders }) => {
  try {
    // receiverName,
    // receiverMobile,
    // receiverAddress,
    // receiverCollected,
    // location,
    // branchId,
    // isPaid,
    // storeCost,
    // discount,
    // tax,
    // deliveryCost,
    // items,
    // isLocated :Boolean
    // locationUrl: String | null

    /*************************************************/
    //Send to the api
    let response = await axios.post(
      `${API_URI}/Trip/MultiOrders`,
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
            "orderId": 6,
            "branchId": 2,
            "branchLat": 30.611838,
            "branchLng": 32.292009,
            "branchNameAr": "كنتاكى",
            "branchNameEn": "KFC",
            "branchAddress": "الرياض",
            "deliveryPriceAr": "25 SAR",
            "deliveryPriceEn": "25 ريال سعودي",
            "paymentTypeAr": "فيزا"
            "paymentTypeEn": "Cash",
            "branchLogo": "https://logo.png",
            "receiverDistance": 1.2 
          }]
        }
        */

    //Transform to be like DB schema
    const ordersToStoreInDB = apiData
      .filter((order) => order.status)
      .map((order) => {
        return {
          master: {
            orderId: order.orderId,
            branchId: order.branchId,
            branchNameAr: order.branchNameAr,
            branchNameEn: order.branchNameEn,
            branchAddress: order.branchAddress,
            receiverAddress: order.receiverAddress,
            receiverDistance: order.receiverDistance,
            branchLogo: order.branchLogo,
            paymentTypeEn: order.paymentTypeEn,
            paymentTypeAr: order.paymentTypeAr,
            deliveryPriceEn: order.deliveryPriceEn,
            deliveryPriceAr: order.deliveryPriceAr,
            branchLocation: {
              coordinates: [order.branchLng, order.branchLat],
            },
          },
        };
      });

    const failedOrders = apiData
      .filter((order) => !order.status)
      .map((order) => ({ orderId: order.orderId, message: order.message }));

    //Save order to DB
    let ordersSave = await OrderModel.insertMany(ordersToStoreInDB);

    return {
      status: true,
      orders: ordersSave,
      failedOrders,
    };
  } catch (e) {
    console.log(`Error in createOrder() method: ${e.message}`);
    return {
      status: false,
      message: `Error in createOrder() method: ${e.message}`,
    };
  }
};
