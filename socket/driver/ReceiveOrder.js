const { validationResult } = require("express-validator");
const { receiveOrder } = require("../../helpers");


module.exports = (io, socket) => {
      socket.on("ReceiveOrder", async ({ branchId, driverId, token }) => {
  try {
    //Developement errors
    if (!branchId)
        return socket.emit("ReceiveOrder", {
          status: false,
          message: "branchId is missing",
        });
      if (!driverId)
        return socket.emit("ReceiveOrder", {
          status: false,
          message: "driverId is missing",
        });
      if (!token)
        return socket.emit("ReceiveOrder", {
          status: false,
          message: "token is missing",
        });
    /******************************************************/

    //Update the orders
    const updateOrdersResult = await receiveOrder({token, branchId});
    
    if(!updateOrdersResult.status) {
      return socket.emit(updateOrdersResult)
    }
    

    let { ordersIds } = updateOrdersResult;
    

    return socket.emit('ReceiveOrder',{status: true, message: `Orders ${ordersIds.map(order => "#" + order)} has been received successfully`});
    /******************************************************/
  } catch (e) {
    console.log(`Error in ReceiveOrder event: ${e.message}`);
    return socket.emit("ReceiveOrder",{
      status: false,
      message: `Error in ReceiveOrder event: ${e.message}`,
    });
  }
});
}

