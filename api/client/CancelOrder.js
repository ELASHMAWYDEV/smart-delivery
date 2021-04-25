const Sentry = require('@sentry/node');
const express = require('express');
const router = express.Router();
const OrderModel = require('../../models/Order');
const DriverModel = require('../../models/Driver');
const { io } = require('../../index');
const { drivers, busyDrivers } = require('../../globals');
const { sendNotification } = require('../../helpers');

router.post('/', async (req, res) => {
	try {
		let { orderId } = req.body;

		//Developmemt Errors
		if (!orderId) return res.json({ status: false, message: 'orderId is missing' });

		orderId = parseInt(orderId);
		/******************************************************/
		//Search for the order
		const orderSearch = await OrderModel.findOne({
			'master.orderId': orderId,
			'master.statusId': { $nin: [2, 6] },
		});

		if (!orderSearch)
			return res.json({
				status: false,
				message: `There is no order with id #${orderId} or the order has been canceled before, or no drivers were found for this order`,
			});

		console.log(`CancelOrder route was called, order: ${orderId}`);
		/******************************************************/

		//Set the order to status cancel
		await OrderModel.updateOne({ 'master.orderId': orderId }, { 'master.statusId': 6 });

		/******************************************************/
		//Check if there was a driver on this order & get his orders & update his busy state
		if (orderSearch.master.driverId) {
			/******************************************************/
			//Check if driver has any busy orders
			const busyOrders = await OrderModel.find({
				'master.statusId': { $in: [1, 3, 4] },
				'master.driverId': orderSearch.master.driverId,
			});

			/******************************************************/
			//Update in memory first
			busyDrivers.set(orderSearch.master.driverId, {
				busyOrders: busyOrders.map((order) => order.master.orderId),
				branchId: busyOrders.length > 0 ? busyOrders[0].master.branchId : null,
			});

			/******************************************************/
			//Set the driver to be not busy
			await DriverModel.updateOne(
				{
					driverId: orderSearch.master.driverId,
				},
				{
					isBusy: busyOrders.length > 0 ? true : false,
				}
			);

			/******************************************************/
			//Get the driver
			const driverSearch = await DriverModel.findOne({
				driverId: orderSearch.master.driverId,
			});

			/******************************************************/

			//Send notification to the driver
			await sendNotification({
				firebaseToken: driverSearch.firebaseToken,
				title: `Order #${orderSearch.master.orderId} was canceled by board`,
				body: `Order #${orderSearch.master.orderId} was canceled by board`,
				type: '2',
				deviceType: +driverSearch.deviceType, // + To Number
				data: {
					message: `Order #${orderSearch.master.orderId} was canceled by board`,
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
			io.to(drivers.get(parseInt(orderSearch.master.driverId))).emit('CancelOrder', {
				status: true,
				isAuthorize: true,
				message: `Order #${orderId} was canceled by board`,
				orderId,
			});
		}
		/******************************************************/

		return res.json({
			status: true,
			message: `Order #${orderId} has been canceled successfully`,
		});

		/******************************************************/
	} catch (e) {
		Sentry.captureException(e);
		console.log(`Error in CancelOrder endpoint: ${e.message}`, e);
		if (!res.headersSent) {
			return res.json({
				status: false,
				message: `Error in CancelOrder endpoint: ${e.message}`,
			});
		}
	}
});

module.exports = router;
