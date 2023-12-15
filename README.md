# Auth Demo App - Backend 
All-inclusive feature reach Authentication service with Node.js, Express.js and PostgreSQL. No other libraries are needed. 

## Motivation
When considering complex authentication scenarios, one might initially think of using solutions like Keycloak or cloud-based
services such as Auth0. However, this app demonstrates that this might not be necessary.
It offers a comprehensive authentication solution based on Node.js and Express.js,
without relying on additional modules like Passport.js or Object-Relational Mapping (ORM) tools.

## Demo
You can see this app in action at [www.authdemoapp.com](https://www.authdemoapp.com/)

## Frontend code
Frontend part of the app can be found here

## Basic Features
1. Create a new user
2. Login with email and password
3. 'Remember me' feature to stay logged in
4. Logout from the current session
5. Delete your own account
6. OAuth via Facebook or Google
7. Email verification
8. Access based on the email verification status
9. Change the current password
10. Reset the forgotten password
11. As admin request a user to change the password
12. As admin block a user
13. As admin request a user to re-login


## Advanced Features
1. Send the link to restore the deleted account
2. Link local account with OAuth accounts
3. Prevent some user roles to use OAuth
4. Logout from OAuth providers
5. 2FA including 2FA with OAuth
6. Extending JWT for active users
7. Auto logout with timeout counter
8. Advanced role based access control
9. One login only
10. Logout from all devices
11. Login as another user
12. Require password check for the critical actions
13. Sync auth status across browser tab

## Getting started

### Local environment setup

* Rename `.env.example` to `.env`
* Using the instructions below fill in `.env` file with your own data
* Update `LOCAL_DOMAIN` const in the file `src/utils/const.js` with the host where frontend request come from

### Production environment setup
* Setup environment variables in your CI/CD pipleline  from the `.env` using the instructions below
* Update `DOMAIN` const in the file `src/utils/const.js` with your production domain name

### Email infrastructure setup

* Create an account in [SendGrid](https://sendgrid.com/)
* Create and save the API key
* Replace `SENDGRID_API_KEY` in `.env` file to yours
* Create Dynamic Templates and import respective templates from `emailTemplates` folder of this repository.
You may only import `*_en` templates if you do not want to send email in German.
* Replace template IDs in `src/utils/email_const.js` to yours

### OAuth setup
* Each OAuth provider has its own way to obtain the `client id` and the `client secret`. But usually the process is straightforward. 
Please refer to the documentation of respective provider. After obtaining the`client id` and the `client secret` put them in `.env` file in the respective sections.
* When configuring the app with the respective provider you need to  provide the return url.
The return url looks like this: http://localhost:4000/auth/oauthCallback/linkedin where
http://localhost:4000 is the base url and `linkedin` is the OAuth provider name. For the Facebook, it is `facebook` and for the Google it is `google`.
Path `auth/oauthCallback/` is common for all the providers.
* If you want to add another provider you will be able to see the pattern in the source code. Make sure you implement the `OpenID Connect` flow.  


### Database setup
* Install local PostgreSQL server or use one in the cloud. Create a database
* Replace `Database Config` parameters in `.env `to yours
* Replace admin user information in `src/database/initAdminUser.js`. Keep the roles
* There are some important configuration parameters
You can change them before running the database setup script or after. See the section `Configuration parameters` below
* Run the database setup script by running `npm run dbInit`

### Configuration parameters
Application configuration is set up via the table `general_config`
You can change the parameters in the table setup object in `src/database/initData.js`
There are 4 parameters that affect the app functionality:
* **oneLoginOnly**: if true,  a user  will not be able to be logged in multiple browsers/devices.
* **autoLogout**: switches on the auto logout feature. After `timeout` time a user will be logged  out if no activity on the site. When a `warningTime` is left before the timeout the visual countdown will appear on the screen.
* **socialLoginNotAllowed** prohibits to use OAuth for the specified roles
* **roleDependencies**: The role in the object key should also have  all the roles in the object  value, which is an array of roles. In the initial config it means that the admin needs to have the role 2FA which effectively means that the admin should have 2FA configured.

### Starting the app
* Install dependencies with `npm i`
* run `npm start`

## Issue Reporting
If you have found a bug, please report it in this repository's [issues](https://github.com/slava-lu/auth-app-backend/issues) section.

## License
This project is licensed under the MIT license. See the [LICENSE file](./LICENSE.txt) for more info.

