const admin = require("firebase-admin");
const Sentry = require("@sentry/node");

//Json Data
const serviceAccount = require("./smart-delivery-firebase.json");

//Initializations
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  maxBreadcrumbs: 1000,
  debug: true,
});
