const Sentry = require('@sentry/node');
const { chatOperators } = require('../../globals');

module.exports = (io, socket) => {
	socket.on('JoinOperatorChat', async ({ operatorId, token }) => {
		try {
			console.log(`JoinOperatorChat event called, driver: ${operatorId}`);
			operatorId = parseInt(operatorId);

			//Add driver socket id to chat map
			chatOperators.set(operatorId, socket.id);

			/****************************************************/
		} catch (e) {
			Sentry.captureException(e);
			console.log(`Error in JoinOperatorChat, error: ${e.message}`);

			socket.emit('JoinOperatorChat', {
				status: false,
				message: `Error in JoinOperatorChat, error: ${e.message}`,
			});
		}
	});
};
