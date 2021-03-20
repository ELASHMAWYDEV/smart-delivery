// const admin = require("firebase-admin");
// const Sentry = require("@sentry/node");
// const { FIREBASE_URI } = require("./globals");
//Json Data
// var serviceAccount = require("./cabi-firebase.json");

//Globals
require("./globals");

//Initializations
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: FIREBASE_URI,
// });

// Sentry.init({
//   dsn:
//     "https://c3a30557318d4219a439dee3aefdf6bb@o469490.ingest.sentry.io/5499056",
//   tracesSampleRate: 1.0,
//   maxBreadcrumbs: 1000,
//   debug: true,
// });