const Sentry = require('@sentry/node');

module.exports = (io, socket) => {
	socket.on('sendMessage', async ({ userId, token }) => {
		try {
		} catch (e) {
			Sentry.captureException(e);
			console.log(`Error in sendMessage, error: ${e.message}`);

			socket.emit('sendMessage', {
				status: false,
				message: `Error in sendMessage, error: ${e.message}`,
			});
		}
	});
};
