const admin = require("firebase-admin");
// const Sentry = require("@sentry/node");

//Json Data
const serviceAccount = require("./smart-delivery-firebase.json");

//Initializations
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


// Sentry.init({
//   dsn:
//     "https://c3a30557318d4219a439dee3aefdf6bb@o469490.ingest.sentry.io/5499056",
//   tracesSampleRate: 1.0,
//   maxBreadcrumbs: 1000,
//   debug: true,
// });
