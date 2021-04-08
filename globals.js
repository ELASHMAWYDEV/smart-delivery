require("dotenv/config");
const { Mutex } = require("async-mutex");

//Api Url
module.exports.API_URI =
  process.env.NODE_ENV == "development"
    ? process.env.API_URI_DEVELOPMENT
    : process.env.NODE_ENV == "pre-prod"
    ? process.env.API_URI_PRE_PROD
    : process.env.NODE_ENV == "production" && process.env.API_URI_PRODUCTION;
//Mongo URI
module.exports.DB_URI =
  process.env.NODE_ENV == "development"
    ? process.env.DB_URI_DEVELOPMENT
    : process.env.NODE_ENV == "pre-prod"
    ? process.env.DB_URI_PRE_PROD
      : process.env.NODE_ENV == "production" && process.env.DB_URI_PRODUCTION;
    
//Global variables
module.exports.clients = new Map(); //Restaurants
module.exports.customers = new Map(); 
module.exports.drivers = new Map();
module.exports.driverBusyOrdersAndBranch = new Map();
module.exports.ordersInterval = new Map();
module.exports.activeOrders = new Map();
module.exports.activeOrderDrivers = new Map();
module.exports.disconnectInterval = new Map();

//API's
module.exports.GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || "";
module.exports.FIREBASE_URI =
  process.env.FIREBASE_URI || "https://super-1231e.firebaseio.com";
module.exports.API_SECRET_KEY = process.env.API_SECRET_KEY || "randomtoken";



//Memroy blocking with mutex
const ordersMutex = new Mutex();


module.exports.ordersMutex = ordersMutex;