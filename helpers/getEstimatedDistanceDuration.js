const Sentry = require("@sentry/node");
const axios = require("axios");
const { GOOGLE_MAPS_KEY } = require("../globals");

module.exports = async ({ pickupLat, pickupLng, dropoffLat, dropoffLng }) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${dropoffLat},${dropoffLng}&key=${GOOGLE_MAPS_KEY}`
    );
    const data = await response.data;

    //Handle location is not valid
    if (data.rows[0].elements[0].status == "ZERO_RESULTS") {
      return {
        status: false,
        message: "Location is not valid",
      };
    }

    return {
      status: true,
      estimatedDistance: parseInt(
        (data.rows[0].elements[0].distance.value / 1000).toFixed()
      ),
    };
  } catch (e) {
    Sentry.captureException(e);

    console.log(`Error in getEstimatedDistanceDuration, error: ${e.message}`);

    return {
      status: false,
      message: `Error in getEstimatedDistanceDuration, error: ${e.message}`,
    };
  }
};
