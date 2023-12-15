const express = require('express')
const crypto = require('crypto')
const { updateData, getOne } = require('@utils/dbUtils')
const { passwordCheck, checkRoles, checkUser, postLogin } = require('@middlewares')
const { createToken, verifyToken } = require('../authUtils')
const { resultCodes, errorCodes, cookiesOption } = require('@utils/const')
const { localAuth } = require('./localAuth')
const { getUserInfoByAccountId, getUserData } = require('../authQueries')

const router = express.Router()

const COOKIES_EXPIRES_IN = process.env.COOKIES_EXPIRES_IN
const cookiesOptionRemember = () => ({
  ...cookiesOption,
  expires: new Date(Date.now() + parseInt(COOKIES_EXPIRES_IN) * 24 * 60 * 60 * 1000),
})

// To keep active user always logged in
/**
 * @swagger
 * /api/v1/auth/login/updateJwt:
 *   get:
 *     tags:
 *       - Authentication - Login
 *     summary: Renew the JWT for the user by updating its expiry date
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: JWT successfully renewed.
 *         content:
 *           application/json:
 *             schema:
 *               type: 'object'
 *               properties:
 *                 resultCode:
 *                   type: 'string'
 *                   enum: ['SUCCESS']
 *                   description: 'Result code indicating successful JWT renewal.'
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: 'string'
 *               description: 'Set-Cookie header to set/update the jwt in the user cookies. Will only be present if user opted for "remember me" during login.'
 */
router.get('/updateJwt', checkUser(), async (req, res, next) => {
  const { accountId, userId, hashCheck, isRemember } = req.user
  try {
    if (isRemember) {
      const jwt = createToken({ accountId, userId, hashCheck, isRemember })
      const options = cookiesOptionRemember()

      return res.cookie('jwt', jwt, { ...options }).send({
        resultCode: resultCodes.SUCCESS,
      })
    }
    return res.send({
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/login/local:
 *   post:
 *     tags:
 *       - Authentication - Login
 *     summary: Authenticate and log in the user using local authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email.
 *                 format: email
 *               mobilePhone:
 *                 type: string
 *                 description: User's mobile phone.
 *               password:
 *                 type: string
 *                 description: User's password.
 *               isRemember:
 *                 type: boolean
 *                 description: Indication if the user should be remembered or not.
 *     responses:
 *       200:
 *         description: Successful login using local authentication.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   enum: ['SUCCESS']
 *                   description: Result code of the operation.
 *                 userInfo:
 *                   $ref: '#/components/schemas/UserInfo'
 */
router.post('/local', localAuth, checkUser(), postLogin(), async (req, res, next) => {
  const { accountId, userId, hashCheck } = req.user
  try {
    const { isRemember } = req.body
    const jwt = createToken({ accountId, userId, hashCheck, isRemember })

    const options = isRemember ? cookiesOptionRemember() : cookiesOption
    const userInfo = getOne(await getUserInfoByAccountId(accountId))

    // change secure to true when using ssl
    return res.cookie('jwt', jwt, { ...options }).send({
      resultCode: resultCodes.SUCCESS,
      userInfo,
    })
  } catch (err) {
    next(err)
  }
})

// impersonation route
/**
 * @swagger
 * /api/v1/auth/login/loginAs:
 *   post:
 *     security:
 *       - cookieAuth: []
 *     tags:
 *       - Authentication - Login
 *     summary: Log in as another user (impersonation)
 *     description: >
 *       This endpoint allows a user with the 'impersonation' role to log in as another user without needing their credentials.
 *       This is typically used by administrators for debugging and support purposes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email of the user to be impersonated.
 *                 format: email
 *     responses:
 *       200:
 *         description: Successfully logged in as the impersonated user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   enum: ['SUCCESS']
 *                   description: Result code of the operation.
 *                 accountId:
 *                   type: integer
 *                   description: ID of the impersonator's account.
 *                 userId:
 *                   type: integer
 *                   description: ID of the impersonated user.
 *                 userInfo:
 *                   type: object
 *                   description: Empty object, as the userInfo will be requested after page reload.
 */
router.post('/loginAs', checkUser(), checkRoles('impersonation'), passwordCheck(), async (req, res, next) => {
  const { accountId, hashCheck } = req.user
  const { email } = req.body
  try {
    const { userId } = getOne(await getUserData(email))
    if (!userId) {
      return res.status(404).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.USER_NOT_FOUND,
        message: req.t('auth_error#login_as_user_email_not_exist'),
      })
    }
    const jwt = createToken({ accountId, userId, hashCheck, impersonationMode: true })

    // The page is reload after this call so no need to get the userInfo, as it will be requested after the reload anyway.
    return res.cookie('jwt', jwt, { ...cookiesOption }).send({
      resultCode: resultCodes.SUCCESS,
      userInfo: {},
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/login/logout:
 *   get:
 *     tags:
 *       - Authentication - Login
 *     summary: Log out the user by clearing the JWT cookie
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   description: The result code indicating the success of the operation.
 *                   example: SUCCESS
 */
router.get('/logout', (req, res, next) => {
  try {
    return res.clearCookie('jwt', { ...cookiesOption }).send({
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/login/logoutAll:
 *   get:
 *     tags:
 *       - Authentication - Login
 *     summary: Log out the user from all devices
 *     description: Log out the user from all devices by updating the hashCheck in the auth_accounts table, then clear the JWT cookie.
 *     responses:
 *       200:
 *         description: Successfully logged out from all devices and cleared JWT cookie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   description: The result code indicating the success of the operation.
 *                   example: SUCCESS
 */
router.get('/logoutAll', async (req, res, next) => {
  try {
    const jwt = verifyToken(req?.cookies?.jwt)
    const { accountId } = jwt
    const user = { accountId }

    // update hashCheck
    if (jwt?.accountId) {
      const hashCheck = crypto.randomBytes(16).toString('hex')
      await updateData(user, 'auth_accounts', { hashCheck }, 'id', accountId)
    }
    return res.clearCookie('jwt', { ...cookiesOption }).send({
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
