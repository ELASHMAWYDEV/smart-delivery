module.exports = {
	HARD_LUCK_NEXT_TIME: "Sorry, you couldn't catch the order request !\nHard luck next time",
	NEW_ORDER_REQUEST: "You have a new order request, Hurry up !",
	NEW_ORDER_BODY: ({ orderId, branchName }) => `Order #${orderId} has been sent to you by ${branchName}`,
	ALREADY_TAKEN_ACTION: "You have already taken action for this order",
	NOT_AUTHORIZED: "You are not authorized",
	ORDER_NOT_AVAILABLE_ANYMORE: "The order is not available any more",
	ORDER_REJECTED_CANCELLED: ({ orderId }) =>
		`You may have reject this order #${orderId} or the board may have canceled it`,
	NO_ORDER_FOUND: ({ orderId }) => `There is no order with id #${orderId}`,
	YOU_HAVE_ORDERS_ALREADY: "You already have received orders !",
	ANOTHER_DRIVER_ACCEPTED: "Sorry, another driver accepted the trip",
	ORDER_ACCEPTED: ({ orderId }) => `Order #${orderId} accepted successfully`,
	ORDER_REJECTED: ({ orderId }) => `Order #${orderId} rejected successfully`,
	ORDER_IGNORED: ({ orderId }) => `Order #${orderId} ingored successfully`,
	ORDER_RECEIVED: ({ ordersIds }) => `Orders ${ordersIds.map((order) => "#" + order)} have been received successfully`,
	ORDER_DELIVERED: ({ orderId }) => `Order #${orderId} has been delivered successfully`,
	LOCATION_UPDATED: "Location updated successfully",
};
