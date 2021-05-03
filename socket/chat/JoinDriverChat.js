const Sentry = require('@sentry/node');
const { chatDrivers } = require('../../globals');

module.exports = (io, socket) => {
	socket.on('JoinDriverChat', async ({ driverId, token }) => {
		try {
			console.log(`JoinDriverChat event called, driver: ${driverId}`);
			driverId = parseInt(driverId);

			//Add driver socket id to chat map
			chatDrivers.set(driverId, socket.id);

			/****************************************************/
		} catch (e) {
			Sentry.captureException(e);
			console.log(`Error in JoinDriverChat, error: ${e.message}`);

			socket.emit('JoinDriverChat', {
				status: false,
				message: `Error in JoinDriverChat, error: ${e.message}`,
			});
		}
	});
};
