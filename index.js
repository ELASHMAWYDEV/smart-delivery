require('dotenv/config');
const Sentry = require('@sentry/node');
const express = require('express');
const path = require('path');
const cors = require('cors');
const { createCipher } = require('crypto');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const localtunnel = require('localtunnel');
const PORT = process.env.PORT || 5050;

try {
	//Init
	require('./init');

	//Middlewares
	app.use(cors());
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	//Database connection
	require('./db');

	//Socket Handler
	require('./socket/index')(io);
	module.exports.io = io;

	app.use(express.static('docs'));

	/********************************************/
	//Documentation
	app.get('/docs', (req, res) => {
		res.sendFile(path.join(__dirname, 'docs', 'index.html'));
	});
	/********************************************/

	//API routes
	app.use('/api', require('./api'));

	//Chat Bot WebHook
	app.use('/chatbot', require('./chatbot/ChatBotHook'));

	// /*-------For Test Only--------*/
	app.get('/test/cycle/:user', (req, res) => {
		res.sendFile(path.join(__dirname, 'test', 'cycle', `${req.params.user}.html`));
	});

	(async () => {
		const tunnel = await localtunnel({ port: +PORT, subdomain: "smart-delivery" });

		console.log('Tunnel Url:', tunnel.url);

		tunnel.on('close', () => {
			console.log('Tunnel is closed');
		});
	})();

	/*------------------------------------------*/

	http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} catch (e) {
	Sentry.captureException(e);
	console.log(`Error in root, ${e.message}`, e);
}
