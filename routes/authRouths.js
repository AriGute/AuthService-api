const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const express = require('express');
const User = require('../models/users');

const router = express.Router();

/**
 * For unit test only
 * test token authentication middleware
 */
router.get('/authTest', authenticateToken, (req, res) => {
	res.json({
		respond: 'you are authorized!',
		name: req.body.name,
	});
});

router.post('/register', async (req, res) => {
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

router.post(
	'/deleteUser',
	authenticateToken,
	(req, res) => {
		User.findOneAndDelete(
			{
				_id: mongoose.Types.ObjectId(req.user.uid),
			},
			(err, user) => {
				if (user != null) {
					res
						.status(200)
						.json({ respond: 'User was deleted.' });
				} else {
					res.status(500).json({
						respond: 'Could not find user to delete',
					});
				}
			},
		);
	},
);

router.post('/login', async (req, res) => {
	try {
		User.findOne(
			{ name: req.body.name },
			async (err, user) => {
				if (user == null) {
					// Could not find user.
					res.status(400).json({
						respond:
							'Could not find user with this credentials.',
					});
					return;
				}
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
					// User is not authorized.
					res
						.status(400)
						.json({ respond: 'User is NOT authorized!' });
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
router.get('/token', (req, res) => {
	const refreshToken = req.body.token;
	if (refreshToken == null) return res.sendStatus(401);
	jwt.verify(
		refreshToken,
		process.env.REFRESH_TOKEN_SECRET,
		async (err, user) => {
			if (err) return res.sendStatus(403);
			const accessToken = await generateAccessToken({
				uid: user.uid,
				user: user.name,
			});
			res.json({
				accessToken: accessToken,
				respond: 'test',
			});
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
			expiresIn: process.env.ACCESS_TOKEN_TTL,
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
			expiresIn: process.env.REFRESH_TOKEN_TTL,
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
			User.findOne(
				{ _uid: user.uid, name: user.name },
				(err, user) => {
					if (user == null)
						return res.status(403).json({
							respond:
								'Could not find the Token owner (user account was deleted?).',
						});
				},
			);
			req.user = user;
			next();
		},
	);
}

module.exports = router;
