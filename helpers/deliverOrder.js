const Sentry = require("@sentry/node");
const axios = require("axios");
const OrderModel = require("../models/Order");
const DriverModel = require("../models/Driver");
const sendNotification = require("./sendNotification");
const { io } = require("../index");
const { drivers } = require("../globals");

const { API_URI } = require("../globals");

module.exports = async ({ orderId, lng, lat, token }) => {
	try {
		//Send to the API
		let response = await axios.post(
			`${API_URI}/Trip/FinishOrder?orderId=${orderId}&lat=${lat}&lng=${lng}`,
			{},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		let data = await response.data;

		if (!data.isAuthorize || !data.status) {
			return {
				status: false,
				isAuthorize: data.isAuthorize,
				message: data.message,
			};
		}

		let { data: apiData } = data;

		//Update the orders on DB
		await OrderModel.updateOne(
			{
				"master.orderId": orderId,
				"master.statusId": { $nin: [2, 6] },
			},
			{
				"master.statusId": 5, //Delivered
			}
		);

		//Check if driver has ballance
		if (apiData.isAllowedBalance) {
			const orderSearch = await OrderModel.findOne({ "master.orderId": orderId });
			const driverSearch = await DriverModel.findOne({ dirverId: orderSearch.master.driverId });

			//Send notification to the driver
			await sendNotification({
				firebaseToken: driverSearch.firebaseToken,
				title: apiData.notAllowedTitle,
				body: apiData.notAllowedMessage,
				type: "5",
				deviceType: +driverSearch.deviceType, // + To Number
				data: {
					title: apiData.notAllowedTitle,
					message: apiData.notAllowedMessage,
				},
			});

			//Send the message to the driver via socket
			io.to(drivers.get(parseInt(orderSearch.master.driverId))).emit("NotAllowedBalance", {
				status: true,
				isAuthorize: true,
				message: `The customer has paid for order #${orderSearch.master.orderId}`,
				orderId,
			});
		}
		return {
			status: true,
			message: "Orders status updated successefully",
		};

		/******************************************************/
	} catch (e) {
		Sentry.captureException(e);

		console.log(`Error in deliverOrder(): ${e.message}`);

		return {
			status: false,
			message: `Error in deliverOrder(): ${e.message}`,
		};
	}
};
