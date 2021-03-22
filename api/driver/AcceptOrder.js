const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");

//Models
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");

router.post("/", async (req, res) => {
  try {
    // const { orderId, driverId } = req.body;
    // //Validation
    // if (!language || !token || !tripId || !driverId) {
    //   return socket.emit("AcceptTrip", {
    //     status: false,
    //     message: `A variable is missing, language: ${language}, token: ${token}, driverId: ${driverId}, tripId: ${tripId}`,
    //   });
    // }

    // //Add driver to socket
    // drivers.set(driverId, socket.id);

    // //Check if trip wasn't accepted by another driver
    // let tripSearch = await TripModel.findOne({
    //   tripId,
    //   tripStatusId: { $ne: 1 }, //Not Equal
    //   driverId: { $ne: driverId },
    //   driversFound: {
    //     $elemMatch: { requestStatus: { $in: [2, 3, 4, 5] } },
    //   },
    // });

    // //If another driver accepted the trip
    // if (tripSearch) {
    //   return socket.emit("AcceptTrip", {
    //     status: false,
    //     message: "Unfortunately, another driver accepted the trip",
    //   });
    // }

    // /***************************************************/
    // //If the driver canceled the trip
    // tripSearch = await TripModel.findOne({
    //   tripId,
    //   tripStatusId: 9,
    //   driversFound: {
    //     $elemMatch: { driverId },
    //   },
    // });

    // if (tripSearch) {
    //   return socket.emit("AcceptTrip", {
    //     status: false,
    //     message: "The trip was canceled by the client",
    //   });
    // }
    // /***************************************************/

    // //Check if another driver accepted the trip
    // if (activeTrips.has(tripId)) {
    //   return socket.emit("AcceptTrip", {
    //     status: false,
    //     message:
    //       "Sorry, another driver accepted the trip, hard luck next time :)",
    //   });
    // }

    // /***************************************************/

    // //Save the driver to the active trips
    // activeTrips.set(tripId, driverId);
    // /***************************************************/
    // //Get the driver data
    // let driverSearch = await DriverModel.findOne({ driverId });
    // driverSearch = driverSearch.toObject();

    // /***************************************************/

    // tripSearch = await TripModel.findOne({
    //   tripId,
    // });

    // //Get the driver distance & duration
    // let estimation = await getEstimatedDistanceDuration({
    //   pickupLong: driverSearch.location.coordinates[0],
    //   pickupLat: driverSearch.location.coordinates[1],
    //   dropoffLong: tripSearch.pickupLong,
    //   dropoffLat: tripSearch.pickupLat,
    // });

    // if (!estimation.status) {
    //   return socket.emit("AcceptTrip", {
    //     status: false,
    //     message: estimation.message,
    //   });
    // }

    // /***************************************************/
    // //Set this driver as the accepter of this trip
    // await TripModel.updateOne(
    //   {
    //     tripId,
    //     driversFound: {
    //       $elemMatch: { driverId },
    //     },
    //   },
    //   {
    //     $set: {
    //       "driversFound.$.requestStatus": 1, //Accept
    //       "driversFound.$.actionDate": new Date().constructor({
    //         timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
    //       }),
    //       tripStatusId: 3, //Accept
    //       driverId,
    //       driverMobile: driverSearch.phoneNumber,
    //       driverRate: 0,
    //       driverDeviceType: driverSearch.deviceType,
    //       driverLanguage: language,
    //       estimatedDriverDuration: estimation.estimatedDuration || -1,
    //       estimatedDriverDistance: estimation.estimatedDistance || -1,
    //       estimatedDriverTime:
    //         new Date().getTime() + estimation.estimatedDuration * 60 * 1000, //The time the driver will arrive to location in ms
    //       tripStatusMessage: `You driver is coming in`,
    //       isSeenNotFound: true,
    //     },
    //   }
    // );

    // /***************************************************/

    // //Get the trip again
    // tripSearch = await TripModel.findOne({ tripId });
    // tripSearch = tripSearch.toObject();

    // /***************************************************/

    // //Send the update trip to the api
    // let response = await axios.post(
    //   `${API_URI}/Trip/UpdateTrip`,
    //   {
    //     tripId,
    //     tripStatusId: 3,
    //     cancelReasonId: 0,
    //     tripDrivers: tripSearch.driversFound,
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${tripSearch.passengerToken}`,
    //       "Accept-Language": language,
    //     },
    //   }
    // );
    // let data = await response.data;

    // if (data.isAuthorize == false || !data.status) {
    //   return socket.emit("AcceptTrip", {
    //     status: false,
    //     isAuthorize: data.isAuthorize,
    //     message: data.message,
    //   });
    // }
    // /***************************************************/
    // //Stop the trip interval
    // if (tripInterval.has(tripSearch.tripId)) {
    //   clearTimeout(tripInterval.get(tripSearch.tripId).timeoutFunction);
    //   tripInterval.delete(tripSearch.tripId);
    // }

    // //Save the driver data coming from trip
    // await TripModel.updateOne(
    //   {
    //     tripId,
    //     driversFound: {
    //       $elemMatch: { driverId },
    //     },
    //   },
    //   {
    //     $set: {
    //       driverName: data.data.driverName,
    //       colorHex: data.data.colorHex,
    //       driverPicture: data.data.driverPicture,
    //       totalDriverEvaluate: data.data.totalDriverEvaluate,
    //       taxiNumber: data.data.taxiNumber,
    //       model: data.data.model,
    //       carPicture: data.data.carPicture,
    //     },
    //   }
    // );

    // //Get the trip again
    // tripSearch = await TripModel.findOne({ tripId });
    // tripSearch = tripSearch.toObject();

    // /***************************************************/

    // //Emit to other drivers that this driver accepted the trip
    // //Drivers on the same range only

    // for (driver of tripSearch.driversFound) {
    //   if (driver.driverId != driverId && driver.requestStatus == 4) {
    //     io.to(drivers.get(driver.driverId)).emit("AcceptTrip", {
    //       status: false,
    //       message: "Sorry, another driver accepted the trip",
    //     });

    //     //If the driver is on socket set isSeenNoCatch
    //   }
    // }

    // /***************************************************/
    // //Delete unwanted data
    // delete tripSearch._id;
    // delete tripSearch.driversFound;

    // /***************************************************/

    // //Set the busyTripId
    // await DriverModel.updateOne(
    //   {
    //     driverId,
    //   },
    //   {
    //     isBusy: true,
    //     busyTripId: tripId,
    //   }
    // );

    // /***************************************************/

    // //Send notification to client
    // await sendNotification({
    //   registrationToken: tripSearch.clientFirebaseToken,
    //   title: getLanguage(tripSearch.passengerLanguage).CAPTAIN_ACCEPTED_TRIP,
    //   body: getLanguage(
    //     tripSearch.passengerLanguage
    //   ).CAPTAIN_ACCEPTED_TRIP_BODY({
    //     driverNameAr: driverSearch.driverNameAr,
    //     driverNameEn: driverSearch.driverNameEn,
    //     modelNameAr: driverSearch.modelNameAr,
    //     modelNameEn: driverSearch.modelNameEn,
    //     colorNameAr: driverSearch.colorNameAr,
    //     colorNameEn: driverSearch.colorNameAr,
    //     plateNumber: driverSearch.plateNumber,
    //   }),
    //   type: "2",
    //   deviceType: +tripSearch.passengerDeviceType, // + To Number
    // });

    // /***************************************************/

    // //Emit to the user that the driver accepted the trip
    // io.to(clients.get(tripSearch.passengerId)).emit("ChangeTripStatus", {
    //   status: true,
    //   message: "A driver has accepted the trip",
    //   tripInfo: tripSearch,
    // });

    // //Send success to the driver
    // socket.emit("AcceptTrip", {
    //   status: true,
    //   message: "The trip was accepted successfully",
    //   tripInfo: tripSearch,
    // });

    // /***************************************************/
    // //In case 2 drivers accepted at the same time
    // setTimeout(async () => {
    //   let tripSearch = await TripModel.findOne({ tripId, driverId });

    //   //Send error to the driver
    //   if (!tripSearch) {
    //     socket.emit("AcceptTrip", {
    //       status: false,
    //       message:
    //         "Sorry, you couldn't catch that trip. Another driver accepted it, hard luck next time :)",
    //     });
    //   }
    // }, 2000);

    /******************************************************/
  } catch (e) {
    return res.json({
      status: false,
      message: `Error in NewOrderRequest endpoint: ${e.message}`,
    });
  }
});

module.exports = router;
