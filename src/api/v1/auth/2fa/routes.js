const express = require('express')
const { authenticator } = require('otplib')
const QRCode = require('qrcode')
const { updateData, insertData, getOne, getAll } = require('@utils/dbUtils')
const { createToken } = require('../authUtils')
const { resultCodes, errorCodes, cookiesOption, userRoles } = require('@utils/const')
const { checkUser, postLogin } = require('@middlewares')
const { getUserInfoByAccountId } = require('../authQueries')
const { getUserInfoByTwoFaCode, getTwoFaSecret } = require('./queries')
const { getUserRoleIds, removeRoleFromUser } = require('@common/queries')

const router = express.Router()

authenticator.options = { window: 1 }

const TWO_FA_ROLE_ID = userRoles.TWO_FA_ROLE_ID

const COOKIES_EXPIRES_IN = process.env.COOKIES_EXPIRES_IN
const cookiesOptionRemember = () => ({
  ...cookiesOption,
  expires: new Date(Date.now() + parseInt(COOKIES_EXPIRES_IN) * 24 * 60 * 60 * 1000),
})

/**
 * @swagger
 * /api/v1/auth/2fa/checkCode:
 *   post:
 *     tags:
 *       - Authentication - 2FA
 *     summary: Verify the one-time code received on the mobile device
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: 'object'
 *             properties:
 *               token:
 *                 type: 'string'
 *                 description: 'Token provided for 2FA.'
 *               twoFaCode:
 *                 type: 'string'
 *                 description: 'temporal code  to identify a user'
 *               isRemember:
 *                 type: 'boolean'
 *                 description: 'Flag to indicate if the user should be remembered for future sessions.'
 *     responses:
 *       200:
 *         description: Token verification successful, user authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: 'object'
 *               properties:
 *                 resultCode:
 *                   type: 'string'
 *                   enum: ['SUCCESS']
 *                   description: 'Result code indicating successful token verification.'
 *                 userInfo:
 *                   $ref: '#/components/schemas/UserInfo'
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: 'string'
 *               description: 'Set-Cookie header to set/update the jwt in the user cookies.'
 */
router.post('/checkCode', postLogin(), async (req, res, next) => {
  const { token, twoFaCode, isRemember } = req.body
  try {
    const { accountId, userId, hashCheck, secret } = getOne(await getUserInfoByTwoFaCode(twoFaCode))
    const user = { accountId }

    if (!secret) {
      return res.status(401).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.USER_NOT_FOUND,
        message: req.t('auth_error#login_failed'),
      })
    }
    const isValid = authenticator.check(token, secret)
    if (isValid) {
      // delete 2 FA code for extra security
      await updateData(user, 'auth_accounts', { twoFaCode: null }, 'id', accountId)

      const jwt = createToken({ accountId, userId, hashCheck, isRemember })
      const options = isRemember ? cookiesOptionRemember() : cookiesOption
      const userInfo = getOne(await getUserInfoByAccountId(accountId))

      return res.cookie('jwt', jwt, { ...options }).send({
        resultCode: resultCodes.SUCCESS,
        userInfo,
      })
    } else {
      return res.status(401).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.WRONG_CODE,
        message: req.t('auth_error#login_failed'),
      })
    }
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/2fa/init:
 *   get:
 *     summary: Initialize the setup of Two-Factor Authentication for the current account
 *     tags:
 *       - Authentication - 2FA
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Returns the 2FA secret and the QR code image URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret:
 *                   type: string
 *                   description: The secret for 2FA.
 *                 imageUrl:
 *                   type: string
 *                   description: The URL of the QR code image for 2FA setup.
 */
router.get('/init', checkUser(), async (req, res, next) => {
  const { accountId } = req.user
  try {
    const secret = authenticator.generateSecret()
    const { email } = getOne(await getUserInfoByAccountId(accountId))
    const service = 'Auth Demo App'
    const otpAuth = authenticator.keyuri(email, service, secret)
    const imageUrl = await QRCode.toDataURL(otpAuth)
    await updateData(req.user, 'auth_accounts', { twoFaSecret: secret }, 'id', accountId)

    return res.send({
      secret,
      imageUrl,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/2fa/confirmInit:
 *   put:
 *     summary: Confirm Two-Factor Authentication setup for the current account by providing the one-time code
 *     tags:
 *       - Authentication - 2FA
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       description: Token required for 2FA confirmation.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: One-time token to verify 2FA setup.
 *     responses:
 *       200:
 *         description: Returns success and user info after successful 2FA setup.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   description: The result code for the operation.
 *                 userInfo:
 *                   $ref: '#/components/schemas/UserInfo'
 */
router.put('/confirmInit', checkUser(), async (req, res, next) => {
  const { accountId, userId } = req.user
  const { token } = req.body

  try {
    const { twoFaSecret: secret } = getOne(await getTwoFaSecret(accountId))
    const isValid = authenticator.check(token, secret)

    if (isValid) {
      await updateData(req.user, 'auth_accounts', { isTwoFaEnabled: true }, 'id', accountId)
      // add role showing that a user has been logged in with 2FA
      const userRoles = getAll(await getUserRoleIds(userId))
      if (userRoles.length === 0 || !userRoles.map((role) => role.roleId).includes(TWO_FA_ROLE_ID)) {
        await insertData(req.user, 'user_to_role', { userId, roleId: TWO_FA_ROLE_ID })
      }
      const userInfo = getOne(await getUserInfoByAccountId(accountId))
      return res.send({
        resultCode: resultCodes.SUCCESS,
        userInfo,
      })
    }
    return res.status(403).send({
      resultCode: resultCodes.ERROR,
      message: req.t('auth_error#invalid_code'),
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/2fa/remove:
 *   put:
 *     summary: Remove Two-Factor Authentication from the current account
 *     tags:
 *       - Authentication - 2FA
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Returns success and user info after successfully removing 2FA.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   description: The result code for the operation.
 *                 userInfo:
 *                   type: object
 *                   description: Updated information about the user.
 */
router.put('/remove', checkUser(), async (req, res, next) => {
  const { accountId, userId } = req.user
  try {
    await updateData(req.user, 'auth_accounts', { isTwoFaEnabled: false, twoFaSecret: null }, 'id', accountId)
    await removeRoleFromUser(TWO_FA_ROLE_ID, userId)

    const userInfo = getOne(await getUserInfoByAccountId(accountId))
    return res.send({
      resultCode: resultCodes.SUCCESS,
      userInfo,
    })
  } catch (err) {
    next(err)
  }
})
module.exports = router
