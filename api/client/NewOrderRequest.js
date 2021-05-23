const Sentry = require('@sentry/node');
const express = require('express');
const router = express.Router();
const { orderCycleDrivers, driverHasTakenAction } = require('../../globals');

//Helpers
const { createOrder } = require('../../helpers');
const orderCycle = require('../../helpers/orderCycle');
/*
 *
 * This route handles new order requests sent from the client (restaurant)
 *
 */

router.post('/', async (req, res) => {
	try {
		//Will receive array || object
		let { orders, drivers } = req.body;

		console.log('Orders', orders);
		/******************************************************/
		//Create the order on DB & API
		const createOrderResult = await createOrder({
			orders,
		});

		if (!createOrderResult.status) return res.json(createOrderResult);

		let { orders: ordersAfterSave } = createOrderResult;

		//Send response to client
		res.json({
			status: true,
			message: 'All orders have been saved',
			orders: (ordersAfterSave && ordersAfterSave.map((order) => order.master.orderId)) || [],
		});
		/******************************************************/
		/*
		 *
		 * @param order
		 * We will work with order variable from here on
		 *
		 *
		 */
		/******************************************************/
		console.log(
			`New Orders: [${ordersAfterSave && ordersAfterSave.map((order) => order.master.orderId)}], drivers: [${
				drivers && drivers.map((driver) => driver)
			}]`
		);
		//Loop through orders
		Promise.all(
			ordersAfterSave.map((order) => {
				orderCycleDrivers.set(order.master.orderId, []);
				driverHasTakenAction.set(order.master.orderId, []);
				orderCycle({ orderId: order.master.orderId, driversIds: drivers || [] });
			})
		);

		//THE OUTSTANDING SOLUTION :) *********VOILA**********

		/******************************************************/
	} catch (e) {
		Sentry.captureException(e);

		console.log(`Error in NewOrderRequest endpoint: ${e.message}`, e);
		if (!res.headersSent) {
			return res.json({
				status: false,
				message: `Error in NewOrderRequest endpoint: ${e.message}`,
			});
		}
	}
});

module.exports = router;
