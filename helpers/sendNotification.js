const Sentry = require("@sentry/node");
const admin = require("firebase-admin");

module.exports = async ({ firebaseToken, title, body, type, deviceType, data = {} }) => {
  try {
    if (!firebaseToken) {
      console.log("Firbase token is missing");
      return;
    }

    let typeDescription = "description";
    switch (type) {
      case "1":
        typeDescription = "New Order Received";
        break;
      case "2":
        typeDescription = "Order Canceled";
        break;
      case "3":
        typeDescription = "Disconnect Intervals";
      case "4":
        typeDescription = "Customer paid for the order";
      case "5":
        typeDescription = "Customer updated his location";
      case "6":
        typeDescription = "Driver balance is not sufficiant";
      case "7":
        typeDescription = "Asking driver if he received the order";
      case "8":
        typeDescription = "Asking driver if he delivered the order";
        break;
    }

    let payload;
    //1 ==> ios, 2 ==> android
    if (deviceType == 1) {
      //Set the data object
      payload = {
        data: {
          title,
          body,
          type,
          typeDescription,
        },
      };
    } else {
      payload = {
        data: {
          type,
          typeDescription,
          ...data,
        },
        notification: {
          body,
          title,
          click_action: "MainActivity",
          android_channel_id: "notification_channel_id",
        },
      };
    }

    let options = {
      priority: "high",
      timeToLive: 60 * 60 * 24,
    };

    let result = await admin.messaging().sendToDevice(firebaseToken, payload, options);

    if (result.results[0].error) {
      console.log(`Firebase error,`, result.results[0].error);
    }
  } catch (e) {
    Sentry.captureException(e);

    console.log(`Error in sendNotification, error: ${e.message}`);
  }
};
