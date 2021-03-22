const DriverModel = require("../models/Driver");

module.exports = async ({ location }) => {
  try {
    let driverSearch = await DriverModel.findOne({
      isOnline: true,
      isBusy: false,
      isDeleted: false,
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [location.coordinates[0], location.coordinates[1]],
          },
        },
      },
    });

    if (driverSearch) {
      return { status: true, driver: driverSearch };
    } else {
      return { status: false, message: "No drivers found" };
    }

    /******************************************************/
  } catch (e) {
    return {
      status: false,
      message: `Error in findNearestDriver(): ${e.message}`,
    };
  }
};
