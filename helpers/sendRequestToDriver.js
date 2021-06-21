const Sentry = require("@sentry/node");
const DeliverySettingsModel = require("../models/DeliverySettings");
const OrderModel = require("../models/Order");
const DriverModel = require("../models/Driver");
const { drivers, activeOrders, busyDrivers, driverHasTakenAction } = require("../globals");
const { io } = require("../index");
const LANG = require("../util/translation");

//Helpers
const sendNotification = require("./sendNotification");
const getEstimatedDistanceDuration = require("./getEstimatedDistanceDuration");

const sendRequestToDriver = async ({ language = "en", driverId, order, driversIds = [], orderDriversLimit = 2 }) => {
	try {
		driverId = parseInt(driverId);

		let { orderId } = order.master;

		//Get the trip data from activeOrders map
		if (!activeOrders.has(orderId)) {
			return io.to(drivers.get(driverId)).emit("NewOrderRequest", {
				status: false,
				message: LANG(language).HARD_LUCK_NEXT_TIME,
			});
		}
		/**************************************************************/
		//Get the driver again
		let driverSearch = await DriverModel.findOne({ driverId });

		if (!driverSearch) {
			Sentry.captureMessage(`Couldn't send request to driver: #${driver.driverId}`);
			return {
				status: false,
				message: `Couldn't send request to driver: #${driver.driverId}`,
			};
		}

		/**************************************************************/

		//Clear last timeout of the order if exist
		let { timeoutFunction } = activeOrders.get(orderId) || {};

		if (timeoutFunction) {
			clearTimeout(timeoutFunction);
		}
		/**************************************************************/

		//Get timerSeconds from settings
		let timerSeconds = 30;
		const settings = await DeliverySettingsModel.findOne({});
		if (settings && settings.timerSeconds) timerSeconds = settings.timerSeconds;

		/**************************************************************/

		//Check if this driver has any busy orders or is not at the same branch ******MEMORY*******

		console.log(`driver ${driverId}`, busyDrivers.get(driverId));
		let { branchId, busyOrders } = busyDrivers.get(driverId) || {
			busyOrders: [],
			branchId: null,
		};
		const orderCycle = require("./orderCycle");

		//If not the same branch --> go & check for another driver
		if (branchId && branchId != order.master.branchId && busyOrders.length >= 1) {
			console.log(`Started cycle from sendRequestToDriver, not same branch,order ${orderId}`);
			orderCycle({ orderId, driversIds, orderDriversLimit });
			return {
				status: true,
				message: `Order ${orderId} went wrong for driver ${driverId}, in another branch, resending to another driver`,
			};
		}
		/**************************************************************/

		//If has busy orders more than limit --> go & check for another driver
		if (busyOrders.length >= orderDriversLimit) {
			console.log(`Started cycle from sendRequestToDriver, orders limit exceed, order ${orderId}`);
			orderCycle({ orderId, driversIds, orderDriversLimit });
			return {
				status: true,
				message: `Order ${orderId} went wrong for driver ${driverId}, orders limit exceeded, resending to another driver`,
			};
		}

		/******************************************************/

		//Update in memory first
		busyDrivers.set(driverId, {
			busyOrders: [...new Set([...busyOrders, order.master.orderId])],
			branchId: order.master.branchId,
		});

		/**************************************************************/
		//Get the deliveryPrice
		let branchDistance; //default
		//Get the driver distance & duration
		let estimation = await getEstimatedDistanceDuration({
			pickupLng: driverSearch.location.coordinates[0],
			pickupLat: driverSearch.location.coordinates[1],
			dropoffLng: order.master.branchLocation.coordinates[0],
			dropoffLat: order.master.branchLocation.coordinates[1],
		});

		if (estimation.status) branchDistance = estimation.estimatedDistance;
		const totalDistance = branchDistance + order.master.receiverDistance;
		let deliveryPrice = order.master.baseFare;
		const overKilos = totalDistance > order.master.minKM ? totalDistance - order.master.minKM : 0;
		const overKilosPrice = overKilos * order.master.overKilo;
		deliveryPrice = deliveryPrice + overKilosPrice;

		deliveryPrice = ((order.master.driverCommision / 100) * deliveryPrice).toFixed(2);

		const deliveryPriceAr = deliveryPrice + " " + order.master.currencyAr;
		const deliveryPriceEn = deliveryPrice + " " + order.master.currencyEn;

		/**************************************************************/
		//Add the driver to the driversFound[] in order
		await OrderModel.updateOne(
			{ "master.orderId": orderId },
			{
				$set: {
					"master.driverId": driverSearch.driverId,
					"master.statuId": 1,
					"master.deliveryPriceAr": deliveryPriceAr,
					"master.deliveryPriceEn": deliveryPriceEn,
				},
				$push: {
					driversFound: {
						_id: driverSearch._id,
						driverId: driverSearch.driverId,
						requestStatus: 4, // 4 => noCatch (default), 1 => accept, 2 => ignore, 3 => reject
						location: driverSearch.location,
						actionDate: new Date().constructor({
							timeZone: "Asia/Bahrain", //to get time zone of Saudi Arabia
						}),
						timeSent: new Date().getTime(),
					},
				},
			}
		);

		/******************************************************/
		//Get the order after update
		let orderSearch = await OrderModel.findOne({ "master.orderId": orderId });
		orderSearch = orderSearch && orderSearch.toObject();

		/******************************************************/
		//Set the driver to be busy
		await DriverModel.updateOne(
			{ driverId: driverSearch.driverId },
			{
				isBusy: true,
			}
		);

		/******************************************************/

		driverHasTakenAction.set(orderId, [
			...(driverHasTakenAction.get(orderId) || []),
			{
				driverId: driverSearch.driverId,
				tookAction: false,
			},
		]);
		/******************************************************/
		let { master } = orderSearch;

		/******************************************************/
		//Send notification to the driver
		await sendNotification({
			firebaseToken: driverSearch.firebaseToken,
			title: LANG(language).NEW_ORDER_REQUEST,
			body: LANG(language).NEW_ORDER_BODY({
				orderId,
				branchName: language == "ar" ? master.brancNameAr : master.branchNameEn,
			}),
			type: "1",
			deviceType: +driverSearch.deviceType, // + To Number
			data: { orderId: master.orderId.toString() },
		});

		/******************************************************/
		console.log(`driver ${driverId}, socketId:`, drivers.get(driverId));
		//Send a request to the driver
		io.to(drivers.get(driverId)).emit("NewOrderRequest", {
			status: true,
			message: LANG(language).NEW_ORDER_REQUEST,
			timerSeconds,
			expiryTime: new Date().getTime() + timerSeconds * 1000,
			order: {
				orderId: master.orderId,
				branchId: master.branchId,
				branchNameAr: master.branchNameAr,
				branchNameEn: master.branchNameEn,
				branchAddress: master.branchAddress,
				receiverAddress: master.receiverAddress,
				receiverDistance: master.receiverDistance,
				branchDistance: master.branchDistance,
				branchLogo: master.branchLogo,
				paymentTypeEn: master.paymentTypeEn,
				paymentTypeAr: master.paymentTypeAr,
				deliveryPriceEn: master.deliveryPriceEn,
				deliveryPriceAr: master.deliveryPriceAr,
				branchLocation: {
					lng: master.branchLocation.coordinates[0],
					lat: master.branchLocation.coordinates[1],
				},
			},
		});

		/***********************************************************/
		/*
		 *
		 *
		 *
		 *
		 * START the timeout function
		 * It should perform action if the driver didn't take any
		 *
		 *
		 *
		 * */
		/***********************************************************/

		//Set the timeout to be timerSeconds * 2
		timeoutFunction = setTimeout(async () => {
			/***********************************************************/

			await OrderModel.updateOne(
				{
					"master.orderId": order.master.orderId,
				},
				{
					$set: {
						"master.driverId": null,
					},
				}
			);

			const busyOrdersDB = await OrderModel.find({
				"master.statusId": { $in: [1, 3, 4] },
				"master.driverId": driverId,
			});

			/************************************/
			//Update in memory
			let { busyOrders, branchId } = busyDrivers.get(+driverId) || {
				busyOrders: [],
				branchId: null,
			};

			//Remove the order id & check if there any other orders
			busyDrivers.set(+driverId, {
				busyOrders: busyOrdersDB
					.filter((orderDB) => orderDB.master.orderId != order.master.orderId)
					.map((order) => order.master.orderId),
				branchId:
					busyOrdersDB.filter((orderDB) => orderDB.master.orderId != order.master.orderId).length == 0
						? null
						: branchId,
			});

			/************************************/
			//Set the driver busy or not
			await DriverModel.updateOne(
				{
					driverId: driverId,
				},
				{
					isBusy: busyOrdersDB.length > 0 ? true : false,
				}
			);

			/************************************/
			/************************************/
			/************************************/
			/************************************/
			/************************************/
			/************************************/
			const orderCycle = require("./orderCycle");

			console.log(`Started cycle from sendRequestToDriver after timeout, order ${orderId}`);
			//Send the order to the next driver
			orderCycle({
				orderId,
				driversIds,
				orderDriversLimit,
			});

			/******************************************************/
		}, timerSeconds * 2 * 1000);

		/******************************************************/
		//Add the timeout to activeOrders
		activeOrders.set(orderId, {
			...(activeOrders.get(orderId) || {}),
			timeoutFunction,
		});

		return {
			status: true,
			message: `Order ${orderId} was sent to driver ${driverId}`,
		};
		/******************************************************/
	} catch (e) {
		Sentry.captureException(e);

		console.log(`Error in sendRequetToDriver() method: ${e.message}`, e);

		return {
			status: false,
			message: `Error in sendRequetToDriver() method: ${e.message}`,
		};
	}
};

module.exports = sendRequestToDriver;
