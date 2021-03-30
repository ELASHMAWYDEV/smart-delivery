const { updateOrderStatus } = require("../../helpers");
const { activeOrders, drivers } = require("../../globals");
const OrderModel = require("../../models/Order");
const DriverModel = require("../../models/Driver");

module.exports = (io, socket) => {
  socket.on("AcceptOrder", async ({ orderId, driverId, token }) => {
    try {
      //Developement errors
      if (!orderId)
        return socket.emit("AcceptOrder", {
          status: false,
          message: "orderId is missing",
        });
      if (!driverId)
        return socket.emit("AcceptOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("AcceptOrder", {
          status: false,
          message: "token is missing",
        });
      /******************************************************/

      console.log(
        `AcceptOrder event was called by driver: ${driverId}, order: ${orderId}`
      );
      //Check if order exist on DB
      let orderSearch = await OrderModel.findOne({ "master.orderId": orderId });

      if (!orderSearch)
        return socket.emit("AcceptOrder", {
          status: false,
          message: "لا يوجد طلب بهذا الرقم",
        });

      /******************************************************/
      //Check if order wasn't accepted by another driver
      //Check memory first for fast seacrch
      if (activeOrders.has(orderId))
        return socket.emit("AcceptOrder", {
          status: false,
          message: "عذرا ، قام سائق أخر بقبول الطلب",
        });

      //Check DB after that
      orderSearch = await OrderModel.findOne({
        "master.orderId": orderId,
        "master.statusId": { $ne: 1 }, //Not Equal,
        "master.driverId": { $ne: driverId },
        driversFound: {
          $elemMatch: { requestStatus: { $in: [2, 3, 4, 5] } },
        },
      });

      //If another driver accepted the order
      if (orderSearch)
        return socket.emit("AcceptOrder", {
          status: false,
          message: "عذرا ، قام سائق أخر بقبول الطلب",
        });

      /******************************************************/

      //Save the driver to the active orders

      activeOrders.set(orderId, driverId);
      /******************************************************/
      //Set this driver as the accepter of this order
      await OrderModel.updateOne(
        {
          "master.orderId": orderId,
          driversFound: {
            $elemMatch: { driverId },
          },
        },
        {
          $set: {
            "driversFound.$.requestStatus": 1, //Accept
            "driversFound.$.actionDate": new Date().constructor({
              timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
            }),
            "master.driverId": driverId,
          },
        }
      );
      /******************************************************/

      //Update the order
      const updateResult = await updateOrderStatus({
        token: token,
        orderId,
        statusId: 3,
      });

      if (!updateResult.status) {
        activeOrders.delete(orderId);
        return socket.emit("AcceptOrder", updateResult);
      }

      console.log(updateResult);
      //Update the order status on DB
      await OrderModel.updateOne(
        {
          "master.orderId": orderId,
        },
        {
          $set: {
            "master.statusId": 3,
          },
        }
      );
      /******************************************************/
      //Save the driver data coming from trip
      // await OrderModel.updateOne(
      //   {
      //     "master.orderId": orderId,
      //     driversFound: {
      //       $elemMatch: { driverId },
      //     },
      //   },
      //   {
      //     $set: {
      //       driverName: updateResult.data.driverName,
      //       colorHex: updateResult.data.colorHex,
      //       driverPicture: updateResult.data.driverPicture,
      //       totalDriverEvaluate: updateResult.data.totalDriverEvaluate,
      //       taxiNumber: updateResult.data.taxiNumber,
      //       model: updateResult.data.model,
      //       carPicture: updateResult.data.carPicture,
      //     },
      //   }
      // );

      /******************************************************/
      //Get the order again
      orderSearch = await OrderModel.findOne({ "master.orderId": orderId });
      orderSearch = orderSearch && orderSearch.toObject();
      /******************************************************/

      //Emit to other drivers that this driver accepted the trip
      //Drivers on the same range only

      for (let driver of orderSearch.driversFound) {
        if (driver.driverId != driverId && driver.requestStatus == 4) {
          io.to(parseInt(drivers.get(driver.driverId))).emit("AcceptTrip", {
            status: false,
            message: "عذرا لقد قام سائق أخر بقبول الطلب",
          });

          //If the driver is on socket set isSeenNoCatch
        }
      }
      /******************************************************/

      //Make sure driver is busy
      await DriverModel.updateOne(
        {
          driverId,
        },
        {
          isBusy: true,
        }
      );

      /***************************************************/
      return socket.emit("AcceptOrder", {
        status: true,
        message: "Order accepted successfully",
        order: orderSearch,
      });
      /******************************************************/
    } catch (e) {
      return socket.emit("AcceptOrder", {
        status: false,
        message: `Error in AcceptOrder event: ${e.message}`,
      });
    }
  });
};
