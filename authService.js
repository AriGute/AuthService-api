require('dotEnv').config;
const express = require('express');
const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('./models/users');

const app = express();
const port = 3000;
const accessTokenTTL = '15m';
const refreshTokenTTL = '7days';

app.use(express.json());

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
		msg: 'you are authorized!',
	});
});

app.get('/authTest', authenticateToken, (req, res) => {
	res.json({
		msg: 'you are authorized!',
		name: req.body.name,
	});
});

app.post('/register', async (req, res) => {
	try {
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(
			req.body.password,
			salt,
		);

		const user = new User({
			name: req.body.name,
			password: hashedPassword,
		});

		User.findOne({ name: req.body.name }).then((result) => {
			if (result == null) {
				user.save().then(function () {
					user.isNew == false
						? res.status(201).json({
								respond: 'User created successfully!',
						  })
						: res.status(503).json({
								respond: 'Could not create user.',
						  });
				});
			} else {
				res.status(409).json({
					respond: 'User with name already exist.',
				});
			}
		});
	} catch (error) {
		console.log('Could not save new user: ', error);
		res.sendStatus(500).send('Could not create user.');
	}
});

app.post('/login', async (req, res) => {
	try {
		User.findOne(
			{ name: req.body.name },
			async (err, user) => {
				if (user == null)
					// Could not find user.
					res
						.status(400)
						.send(
							'Could not find user with this credentials.',
						);
				// Found user.
				const authorized = await bcrypt.compare(
					req.body.password,
					user.password,
				);
				if (authorized) {
					// User is authorized.
					const payload = {
						uid: user.id.toString(),
						name: user.name,
					};
					const accessToken = await generateAccessToken(
						payload,
					);
					const refreshToken = await generateRefreshToken(
						payload,
					);

					// For future token refresh.
					const refreshTokenAndUserInfo = jwt.sign(
						payload,
						refreshToken,
					);

					res.status(200).json({
						accessToken: accessToken,
						refreshToken: refreshToken,
					});
				} else {
					// user is not authorized.
					res
						.status(400)
						.json({ msg: 'User is NOT authorized!' });
				}
			},
		);
	} catch (error) {
		console.log('Could not login user: ', error);
		res.sendStatus(500).send('Could not login user.');
	}
});

/**
 * Rout for getting new access token
 * by providing refresh token.
 */
app.get('/token', (req, res) => {
	const refreshToken = req.body.token;
	if (refreshToken == null) return res.sendStatus(401);
	jwt.verify(
		refreshToken,
		process.env.REFRESH_TOKEN_SECRET,
		async (err, user) => {
			if (err) return res.sendStatus(403);
			console.log(user);
			const accessToken = await generateAccessToken({
				uid: user.uid,
				user: user.name,
			});
			res.json({ accessToken: accessToken });
		},
	);
});

/**
 * Async function for generating access token.
 *
 * @param payload token requestor identifiers ({uid, name}).
 * @returns signed access token.
 */
async function generateAccessToken(payload) {
	try {
		const token = process.env.ACCESS_TOKEN_SECRET;
		return jwt.sign(payload, token, {
			expiresIn: accessTokenTTL,
		});
	} catch (error) {
		console.log('Could not generate access token: ', error);
	}
}

/**
 * Async function for generating refresh token.
 *
 * @param payload token requestor identifiers ({uid, name}).
 * @returns signed refresh token.
 */
async function generateRefreshToken(payload) {
	try {
		const token = process.env.REFRESH_TOKEN_SECRET;
		return jwt.sign(payload, token, {
			expiresIn: refreshTokenTTL,
		});
	} catch (error) {
		console.log('Could not generate access token: ', error);
	}
}

/**
 * Middleware for authenticate tokens before any action
 * that require authorization.
 *
 * @returns the name of the user if he has authenticated.
 */
function authenticateToken(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	if (token == null) return res.sendStatus(401);
	jwt.verify(
		token,
		process.env.ACCESS_TOKEN_SECRET,
		(err, user) => {
			if (err) return res.sendStatus(403);
			req.user = user;
			next();
		},
	);
}

// app.listen(port);
https
	.createServer(
		{
			key: fs.readFileSync('ssl/key.pem'),
			cert: fs.readFileSync('ssl/certificate.pem'),
		},
		app,
	)
	.listen(port, () => {
		console.log(
			'Server up and running over SSL in port: ' + port,
		);
	});

module.exports = app;
