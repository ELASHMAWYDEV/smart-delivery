const admin = require("firebase-admin");

module.exports = async ({
  firebaseToken,
  title,
  body,
  type,
  deviceType,
  data = {},
}) => {
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

    let result = await admin
      .messaging()
      .sendToDevice(firebaseToken, payload, options);

    console.log(`Firebase sent,`, result);
  } catch (e) {
    console.log(`Error in sendNotification, error: ${e.message}`);
  }
};
