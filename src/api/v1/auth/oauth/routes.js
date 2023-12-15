const express = require('express')
const axios = require('axios')
const { updateData, getOne } = require('@utils/dbUtils')
const { createToken } = require('../authUtils')
const { resultCodes, cookiesOption, loginProviders } = require('@utils/const')
const { oauthMiddleware } = require('./oauthMiddleware')
const { checkUser, postLogin } = require('@middlewares')
const { getUserInfoByAccountId } = require('../authQueries')
const { getLogoutOptions } = require('./helpers')
const { getTokens } = require('./queries')

const router = express.Router()

const COOKIES_EXPIRES_IN = process.env.COOKIES_EXPIRES_IN
const cookiesOptionRemember = () => ({
  ...cookiesOption,
  expires: new Date(Date.now() + parseInt(COOKIES_EXPIRES_IN) * 24 * 60 * 60 * 1000),
})

// this route is called by [oauthProvider].js in next.js app
/**
 * @swagger
 * /api/v1/auth/oauth/loginOauth:
 *   post:
 *     tags:
 *       - Authentication - OAuth
 *     summary: Initiate the second step of OAuth to exchange the code for an ID token. If a user with the email from this ID token doesn't exist, create one
 *     parameters:
 *       - in: query
 *         name: isRemember
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Indication if the user should be remembered or not.
 *       - in: query
 *         name: code
 *         schema:
 *          type: string
 *         description: Code for Facebook verification.
 *       - in: query
 *         name: provider
 *         required: true
 *         description:  OAuth provider name.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful login using Facebook.
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
router.post('/loginOauth', oauthMiddleware(), checkUser(), postLogin(), async (req, res, next) => {
  const { accountId, userId, hashCheck } = req.user
  try {
    const userInfo = getOne(await getUserInfoByAccountId(accountId))

    const isRemember = req?.query?.isRemember === 'true'
    const jwt = createToken({ accountId, userId, hashCheck, isRemember })

    const options = isRemember ? cookiesOptionRemember() : cookiesOption

    await updateData(req.user, 'auth_accounts', { passwordChangeRequired: false }, 'id', accountId)

    return res.cookie('jwt', jwt, { ...options }).send({
      resultCode: resultCodes.SUCCESS,
      userInfo,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/oauth/logoutOauth:
 *   get:
 *     tags:
 *       - Authentication - OAuth
 *     summary: Log out the user from the OAuth service
 *     parameters:
 *       - name: userId
 *         in: query
 *         description: User id in Facebook.
 *         schema:
 *           type: string
 *       - name: provider
 *         in: query
 *         required: true
 *         description:  OAuth provider name.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully logged out from Facebook and cleared JWT cookie.
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
router.get('/logoutOauth', async (req, res, next) => {
  const { userId, provider } = req.query
  try {
    let token
    if (provider === loginProviders.GOOGLE || provider === loginProviders.LINKEDIN) {
      const { refresh_token: refreshToken, access_token: accessToken } = getOne(await getTokens(userId))
      token = refreshToken || accessToken
    }

    await axios(getLogoutOptions(userId, provider, token))
    return res.clearCookie('jwt', { ...cookiesOption }).send({
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    console.log('err', err)
    next(err)
  }
})

module.exports = router
