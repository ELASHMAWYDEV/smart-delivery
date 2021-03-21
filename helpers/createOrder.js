const axios = require("axios");
const { API_URI } = require("../globals");
const OrderModel = require("../models/Order");

module.exports = async ({
  token,
  receiverName,
  receiverMobile,
  receiverAddress,
  receiverLocation,
  receiverCollected,
  branchId,
  isPaid,
  storeCost,
  discount,
  tax,
  deliveryCost,
  items,
}) => {
  try {
    //Send to the api
    let response = await axios.post(
      `${API_URI}/Trip/NewTrip`,
      {
        receiverName,
        receiverMobile,
        receiverAddress,
        location: receiverLocation,
        branchId,
        isPaid,
        storeCost,
        discount,
        tax,
        deliveryCost,
        items,
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

    /*  @response
    {
    "message": "The Trip was created successfully",
    "status": true,
    "isAuthorize": true,
    "data": {
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
    }
}
*/

    //Save order to DB

    let orderSave = await OrderModel.create({
      master: {
        orderId: apiData.orderId,
        branchId: apiData.branchId,
        branchNameAr: apiData.branchNameAr,
        branchNameEn: apiData.branchNameEn,
        receiverName,
        receiverMobile,
        receiverAddress,
        isPaid,
        storeCost,
        discount,
        tax,
        deliveryCost,
        receiverLocation: {
          coordinates: [receiverLocation[0], receiverLocation[1]],
        },
        branchLocation: {
          coordinates: [apiData.branchLng, apiData.branchLat],
        },
        fromReceiver: apiData.fromReceiver,
      },
      items,
    });

    return {
      status: true,
      orderSave,
    };
  } catch (e) {
    console.log(`Error in createOrder() method: ${e.message}`);
    return {
      status: false,
      message: `Error in createOrder() method: ${e.message}`,
    };
  }
};
