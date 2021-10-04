# AuthService-API

Authentication service api using express and mongo db.

## Auth Service features:

- Register user with name and password.
- Hash passwords in the database using Bcrypt and salt.
- Login with the same name and password.
- Generate access token with expired time for authenticated users.
- Generate refresh tokens for getting new access tokens.

## Essential environment variables:

- USERS_DB - mongo db path for the users.
- USERS_COLLECTION - users collection name.
- ACCESS_TOKEN_SECRET - secret for access tokens.
- REFRESH_TOKEN_SECRET - secret for refresh tokens.
