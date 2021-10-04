const chai = require('chai');
var should = require('chai').should();
const chaiHttps = require('chai-http');
const authService = require('../authService.js');

describe('Authenticate service', function () {
	chai.use(chaiHttps);
	const testUser = {
		name: 'test name16',
		password: 'abc123',
	};

	let accessToken;
	let refreshToken;

	it('Register service', function (done) {
		chai
			.request(authService)
			.post('/register')
			.send(testUser)
			.end((err, res) => {
				res.should.have.status(201);
				res.body.should.have.property('respond');

				console.log('status: ', res.status);

				done();
			});
	});

	it('Login service', function (done) {
		chai
			.request(authService)
			.post('/login')
			.send(testUser)
			.end((err, res) => {
				res.should.have.status(200);
				res.body.should.have.property('accessToken');
				res.body.should.have.property('refreshToken');

				accessToken = res.body.accessToken;
				refreshToken = res.body.refreshToken;

				console.log('status: ', res.status);
				console.log('access token :', accessToken);
				console.log('refresh token :', refreshToken);
				done();
			});
	});

	it('Token authentication test', function (done) {
		chai
			.request(authService)
			.post('/register')
			.set('Authorization', 'Bearer ' + accessToken)
			.send(testUser)
			.end((err, res) => {
				res.body.should.have.property('respond');
				console.log(res.body.respond);

				console.log('status: ', res.status);

				done();
			});
	});

	it('Get new access token with the refresh token', function (done) {
		chai
			.request(authService)
			.post('/token')
			.send({ token: refreshToken })
			.end((err, res) => {
				res.body.should.have.property('accessToken');

				console.log('status: ', res.status);

				console.log(
					'new access token: ',
					res.body.accessToken,
				);
				done();
			});
	});
});
