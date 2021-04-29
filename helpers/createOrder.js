const Sentry = require('@sentry/node');
const OrderModel = require('../models/Order');

module.exports = async ({ orders }) => {
	try {
		//Transform to be like DB schema
		const ordersToStoreInDB = orders.map((order) => {
			return {
				master: {
					orderId: order.orderId,
					branchId: order.branchId,
					branchNameAr: order.branchNameAr,
					branchNameEn: order.branchNameEn,
					branchAddress: order.branchAddress,
					receiverAddress: order.receiverAddress,
					receiverName: order.receiverName,
					receiverMobile: order.receiverMobile,
					receiverDistance: order.receiverDistance,
					branchLogo: order.branchLogo,
					paymentTypeEn: order.paymentTypeEn,
					paymentTypeAr: order.paymentTypeAr,
					deliveryPriceEn: order.deliveryPriceEn,
					deliveryPriceAr: order.deliveryPriceAr,
					branchLocation: {
						coordinates: [order.branchLng, order.branchLat],
					},
				},
			};
		});

		//Save order to DB
		let ordersSave = await OrderModel.insertMany(ordersToStoreInDB);

		return {
			status: true,
			orders: ordersSave,
		};
	} catch (e) {
		Sentry.captureException(e);

		console.log(`Error in createOrder() method: ${e.message}`);
		return {
			status: false,
			message: `Error in createOrder() method: ${e.message}`,
		};
	}
};
