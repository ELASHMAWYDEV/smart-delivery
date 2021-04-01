const admin = require("firebase-admin");

module.exports = async ({ firebaseToken, title, body, type, deviceType }) => {
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
    if (deviceType == 2) {
      //Set the data object
      payload = {
        data: {
          title,
          body,
          type,
          typeDescription,
          click_action: "MainActivity",
          android_channel_id: "notification_channel_id",
        },
      };
    } else {
      payload = {
        data: {
          type,
          typeDescription,
        },
        notification: {
          body,
          title,
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
