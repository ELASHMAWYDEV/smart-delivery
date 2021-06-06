const Sentry = require("@sentry/node");
const AR = require("./ar");
const EN = require("./en");

module.exports = (language) => {
	try {
		switch (language) {
			case "ar":
				return AR;
			case "en":
				return EN;
			default:
				return EN;
		}
	} catch (e) {
		console.log("Error in translation:", e.message);
		Sentry.captureException(e);
	}
};
