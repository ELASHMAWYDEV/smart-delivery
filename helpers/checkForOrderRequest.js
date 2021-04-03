//Models
const OrderModel = require("../models/Order");
const DeliverySettingsModel = require("../models/DeliverySettings");

module.exports = async ({ socket, driverId }) => {
  try {
    //Search for this driver on a order with & requestStatus = 4 & isSeenNoCatch = false
    let orderSearch = await OrderModel.findOne({
      "master.driverId": driverId,
      driversFound: {
        $elemMatch: {
          isSeenNoCatch: false,
          requestStatus: 4,
          driverId,
        },
      },
    });

    if (!orderSearch) return;
    orderSearch = orderSearch.toObject();

    let { master, driversFound } = orderSearch;

    //Get the order timeSent
    let { timeSent } = driversFound.find(
      (driver) => driver.driverId == driverId
    );

    /*************************************************************/

    //Get the remaining seconds to accept the order
    let timerSeconds = 20; //default
    let deliverySettings = await DeliverySettingsModel.findOne({});
    deliverySettings = deliverySettings && deliverySettings.toObject();
    if (deliverySettings.timerSeconds)
      timerSeconds = deliverySettings.timerSeconds;

    /*************************************************************/

    //If the timePassed was more than timerSeconds --> send false
    const timePassed = (new Date().getTime() - timeSent) / 1000;

    if (timePassed >= timerSeconds - 1) {
      console.log(
        `Sent false about new order request ${master.orderId} to driver ${driverId} on GoOnline`
      );
      //Emit to the driver the NewOrderRequest event
      socket.emit("NewOrderRequest", {
        status: false,
        isAuthorize: true,
        message:
          "Sorry, you couldn't catch the order request !\nHard luck next time",
      });

      /*************************************************************/

      //Set the isSeenRequest to true
      await OrderModel.updateOne(
        {
          "master.orderId": master.orderId,
          driversFound: {
            $elemMatch: {
              isSeenNoCatch: false,
              requestStatus: 4,
              driverId,
            },
          },
        },
        {
          $set: {
            "driversFound.$.isSeenNoCatch": true,
          },
        }
      );

      /*************************************************************/
    } else {
      console.log(
        `Sent the new order request ${master.orderId} to driver ${driverId} on GoOnline`
      );

      setTimeout(() => {
        //Emit to the driver the NewOrderRequest event
        socket.emit("NewOrderRequest", {
          status: true,
          message: "You have a new order request",
          timerSeconds,
          order: {
            orderId: master.orderId,
            branchId: master.branchId,
            branchNameAr: master.branchNameAr,
            branchNameEn: master.branchNameEn,
            branchAddress: master.branchAddress,
            receiverAddress: master.receiverAddress,
            receiverDistance: master.receiverDistance,
            branchLogo: master.branchLogo,
            paymentTypeEn: master.paymentTypeEn,
            paymentTypeAr: master.paymentTypeAr,
            deliveryPriceEn: master.deliveryPriceEn,
            deliveryPriceAr: master.deliveryPriceAr,
            branchLocation: {
              lng: master.branchLocation.coordinates[0],
              lat: master.branchLocation.coordinates[1],
            },
          },
        });
      }, 750);
    }

    /*************************************************************/
  } catch (e) {
    console.log(`Error in checkForOrderRequest() : ${e.message}`, e);
    socket.emit("GoOnline", {
      status: false,
      message: `Error in checkForOrderRequest() : ${e.message}`,
    });
  }
};
