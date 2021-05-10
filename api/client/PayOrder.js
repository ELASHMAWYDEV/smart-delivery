const Sentry = require('@sentry/node');
const express = require('express');
const router = express.Router();
const OrderModel = require('../../models/Order');
const DriverModel = require('../../models/Driver');
const { io } = require('../../index');
const { drivers } = require('../../globals');
const { sendNotification } = require('../../helpers');

router.post('/', async (req, res) => {
	try {
		//No validation required
		let { orderId } = req.body;

		orderId = parseInt(orderId);
		/******************************************************/
		//Search for the order
		const orderSearch = await OrderModel.findOne({
			'master.orderId': orderId,
		});

		/******************************************************/
		//Send notification to driver
		if (orderSearch.master.driverId) {
			//Get the driver
			const driverSearch = await DriverModel.findOne({
				driverId: orderSearch.master.driverId,
			});

			/******************************************************/

			//Send notification to the driver
			await sendNotification({
				firebaseToken: driverSearch.firebaseToken,
				title: `The customer has paid for order #${orderSearch.master.orderId}`,
				body: `Please go and check for order #${orderSearch.master.orderId} again.\nThe customer has paid for the order`,
				type: '4',
				deviceType: +driverSearch.deviceType, // + To Number
				data: {
					message: `The customer has paid for order #${orderSearch.master.orderId}`,
					branchNameAr: orderSearch.master.branchNameAr || '',
					branchNameEn: orderSearch.master.branchNameEn || '',
					branchLogo: orderSearch.master.branchLogo || '',
					branchAddress: orderSearch.master.branchAddress || '',
					receiverAddress: orderSearch.master.receiverAddress || '',
					orderId: orderSearch.master.orderId.toString() || '',
				},
			});

			/******************************************************/
			//Send the cancel to the driver via socket
			io.to(drivers.get(parseInt(orderSearch.master.driverId))).emit('PayOrder', {
				status: true,
				isAuthorize: true,
				message: `The customer has paid for order #${orderSearch.master.orderId}`,
				orderId,
			});
		}
		/******************************************************/

		return res.json({
			status: true,
			message: `Notification sent to driver`,
		});
	} catch (e) {
		Sentry.captureException(e);
		console.log(`Error in PayOrder endpoint: ${e.message}`, e);
		if (!res.headersSent) {
			return res.json({
				status: false,
				message: `Error in PayOrder endpoint: ${e.message}`,
			});
		}
	}
});

module.exports = router;
