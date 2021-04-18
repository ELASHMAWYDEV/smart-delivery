//Models
const DriverModel = require("../../models/Driver");

module.exports = async () => {
  try {
    //Get all availabel drivers (online, not busy)
    let available = await DriverModel.countDocuments({
      isOnline: true,
      isBusy: false,
      isDeleted: false,
    });

    //Get all offline drivers
    let offline = await DriverModel.countDocuments({
      isOnline: false,
      isDeleted: false,
    });

    //Get all busy drivers
    let busy = await DriverModel.countDocuments({
      isBusy: true,
      isDeleted: false,
    });

    //Get the count of all drivers
    let total = await DriverModel.estimatedDocumentCount();

    return {
      status: true,
      counts: {
        available,
        offline,
        busy,
        total,
      },
    };
  } catch (e) {
    console.log(`Error in countDrivers, error: ${e.message}`);

    return {
      status: false,
      message: `Error in countDrivers, error: ${e.message}`,
    };
  }
};
