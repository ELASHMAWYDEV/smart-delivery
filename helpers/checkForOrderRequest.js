const Sentry = require("@sentry/node");
//Models
const OrderModel = require("../models/Order");
const DeliverySettingsModel = require("../models/DeliverySettings");

module.exports = async ({ socket, driverId }) => {
  try {
    /*************************************************************/

    //Get timerSeconds
    let timerSeconds = 20; //default
    let deliverySettings = await DeliverySettingsModel.findOne({});
    deliverySettings = deliverySettings && deliverySettings.toObject();
    if (deliverySettings.timerSeconds)
      timerSeconds = deliverySettings.timerSeconds;

    /*************************************************************/
    //Search for this driver on a order with & requestStatus = 4 & isSeenOrder = false
    let ordersSearch = await OrderModel.find({
      // "master.driverId": driverId,
      "master.statusId": 1,
      driversFound: {
        $elemMatch: {
          isSeenOrder: false,
          requestStatus: 4,
          driverId,
        },
      },
    });

    if (ordersSearch.length == 0) return;

    for (let order of ordersSearch) {
      let { master, driversFound } = order;

      //Get the order timeSent
      let { timeSent } = driversFound.find(
        (driver) => driver.driverId == driverId
      );

      /*************************************************************/

      //If the timePassed was more than timerSeconds --> send false
      const timePassed = (new Date().getTime() - timeSent) / 1000;

      if (timePassed >= timerSeconds - 0.5) {
        console.log(
          `Sent false about new order request ${master.orderId} to driver ${driverId} on Join`
        );

        setTimeout(() => {
          //Emit to the driver the NewOrderRequest event
          socket.emit("NewOrderRequest", {
            status: false,
            isAuthorize: true,
            message:
              "Sorry, you couldn't catch the order request !\nHard luck next time",
          });
        }, 500);

        /*************************************************************/

        //Set the isSeenRequest to true
        await OrderModel.updateOne(
          {
            "master.orderId": master.orderId,
            driversFound: {
              $elemMatch: {
                driverId,
              },
            },
          },
          {
            $set: {
              "driversFound.$.isSeenOrder": true,
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
            timerSeconds: timerSeconds - timePassed,
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
        }, 200);
      }
    }

    /*************************************************************/
  } catch (e) {
    Sentry.captureException(e);

    console.log(`Error in checkForOrderRequest() : ${e.message}`, e);

    setTimeout(() => {
      socket.emit("NewOrderRequest", {
        status: false,
        message: `Error in checkForOrderRequest() : ${e.message}`,
      });
    }, 1000);
  }
};
