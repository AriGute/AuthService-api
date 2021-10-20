require('dotEnv').config;
const express = require('express');
const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const authService = require('./routes/authRouths');

app.use(express.json());

app.use('/auth', authService);

mongoose.connect(process.env.USERS_DB);
mongoose.connection
	.once('open', function () {
		console.log('Connection has been made.');
	})
	.on('error', function (error) {
		console.log('Connection error: ', error);
	});

// can be remove at any time
app.get('/test', (req, res) => {
	res.json({
		respond: 'Test run successfully',
	});
});

function stop() {
	console.log('Closing server');
	server.close();
}

https
	.createServer(
		{
			key: fs.readFileSync('ssl/key.pem'),
			cert: fs.readFileSync('ssl/certificate.pem'),
		},
		app,
	)
	.listen(process.env.port, () => {
		console.log(
			'Server up and running over SSL in port: ' +
				process.env.port,
		);
	});

module.exports = app;
module.exports.stop = stop;
