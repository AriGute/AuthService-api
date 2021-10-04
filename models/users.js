require('dotEnv').config();
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
	name: String,
	password: String,
});

const User = mongoose.model(
	process.env.USERS_COLLECTION,
	UserSchema,
);

module.exports = User;
