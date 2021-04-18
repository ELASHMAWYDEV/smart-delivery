//Models
const DriverModel = require("../../models/Driver");

module.exports = async ({ lat, lng, maxDistance }) => {
  try {
    //Get all availabel drivers (online, not busy)
    let available = await DriverModel.countDocuments({
      isOnline: true,
      isDeleted: false,
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: lat == 0 ? Infinity : maxDistance,
        },
      },
    });

    //Get all offline drivers
    let offline = await DriverModel.countDocuments({
      isOnline: false,
      isDeleted: false,
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: lat == 0 ? Infinity : maxDistance,
        },
      },
    });

    //Get all busy drivers
    let busy = await DriverModel.countDocuments({
      isBusy: true,
      isDeleted: false,
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: lat == 0 ? Infinity : maxDistance,
        },
      },
    });

    //Get the count of all drivers
    let total = await DriverModel.countDocuments({
      isDeleted: false,
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: lat == 0 ? Infinity : maxDistance,
        },
      },
    });

    return {
      status: true,
      countsInRange: {
        available,
        offline,
        busy,
        total,
      },
    };
  } catch (e) {
    console.log(`Error in countDriversInRange, error: ${e.message}`);

    return {
      status: false,
      message: `Error in countDriversInRange, error: ${e.message}`,
    };
  }
};
