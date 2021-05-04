require('dotenv/config');
const { Mutex } = require('async-mutex');

//Api Url
module.exports.API_URI =
	process.env.NODE_ENV == 'development'
		? process.env.API_URI_DEVELOPMENT
		: process.env.NODE_ENV == 'pre-prod'
		? process.env.API_URI_PRE_PROD
		: process.env.NODE_ENV == 'production' && process.env.API_URI_PRODUCTION;
//Mongo URI
module.exports.DB_URI =
	process.env.NODE_ENV == 'development'
		? process.env.DB_URI_DEVELOPMENT
		: process.env.NODE_ENV == 'pre-prod'
		? process.env.DB_URI_PRE_PROD
		: process.env.NODE_ENV == 'production' && process.env.DB_URI_PRODUCTION;

//Global variables
module.exports.clients = new Map(); //Restaurants socket ids'
module.exports.admins = new Map(); //Restaurants socket ids'
module.exports.customers = new Map(); //Customers socket ids' - for tracking
module.exports.drivers = new Map(); //Drivers socket ids'
module.exports.activeOrders = new Map(); //Hold active orders currently being processed
module.exports.orderCycleDrivers = new Map(); //Hold any driver from starting the cycle again if it has already started
module.exports.activeOrderDrivers = new Map();
module.exports.disconnectInterval = new Map();
module.exports.busyDrivers = new Map(); //Hold all drivers that are currently busy with thier branch id & orders ids[]
module.exports.driverHasTakenAction = new Map(); //Hold the driver bool to check if he took action on that order or not

//Chat global variables
module.exports.chatDrivers = new Map();
module.exports.chatOperators = new Map();

//API's
module.exports.GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || '';
module.exports.FIREBASE_URI = process.env.FIREBASE_URI || 'https://super-1231e.firebaseio.com';
module.exports.API_SECRET_KEY = process.env.API_SECRET_KEY || 'randomtoken';

//Chat API
module.exports.CHAT_API_SEND_MESSAGE = process.env.CHAT_API_URI + '/sendMessage?token=' + process.env.CHAT_API_TOKEN;
module.exports.CHAT_API_TYPING = process.env.CHAT_API_URI + '/typing?token=' + process.env.CHAT_API_TOKEN;
module.exports.CHAT_MOBILE_PHONE = process.env.CHAT_MOBILE_PHONE;
module.exports.MAP_DECODER_URI = process.env.MAP_DECODER_URI;
