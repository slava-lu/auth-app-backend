const express = require('express')
const { getOne, insertData } = require('@utils/dbUtils')
const { getUserProfile, updateProfileTransaction, getOauthProfile, getUserInfoByUserId } = require('./queries')
const { resultCodes } = require('@utils/const')
const { userRoles, loginProviders } = require('@utils/const')
const { getUserInfoByAccountId } = require('../../auth/authQueries')

const { passwordCheck } = require('@middlewares')

const router = express.Router()

/**
 * @swagger
 * /api/v1/users/profile/getBasic:
 *   get:
 *     tags:
 *       - User - Profile Management
 *     summary: Get the basic profile information for the User Interface (UI) header
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: 'object'
 *               properties:
 *                 userInfo:
 *                   $ref: '#/components/schemas/UserInfoWithImpersonation'
 *                 impersonationMode:
 *                   type: 'string'
 *                   description: 'The impersonation mode active for the user (if any).'
 *                 facebookProfile:
 *                   type: 'object'
 *                   description: 'Profile information if the user last logged in using Facebook.'
 *                   properties:
 *                     email:
 *                       type: 'string'
 *                       format: 'email'
 *                       description: "Facebook account's email address."
 *                     given_name:
 *                       type: 'string'
 *                       description: "Facebook account's given name."
 *                     family_name:
 *                       type: 'string'
 *                       description: "Facebook account's family name."
 *                     name:
 *                       type: 'string'
 *                       description: "Full name of the Facebook account."
 *                     picture:
 *                       type: 'string'
 *                       description: "URL to the Facebook account's profile picture."
 */
router.get('/getBasic', async (req, res, next) => {
  const { accountId, userId, impersonationMode } = req.user
  try {
    let oauthProfile = {}
    const userInfo = accountId ? getOne(await getUserInfoByUserId(userId)) : {}
    const { lastLoginProvider, email } = userInfo

    // add oauth data to the response.
    if (lastLoginProvider !== loginProviders.LOCAL) {
      oauthProfile = getOne(await getOauthProfile(email, lastLoginProvider))
    }
    return res.send({
      userInfo: { ...userInfo, impersonationMode },
      impersonationMode,
      oauthProfile,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/users/profile/update:
 *   put:
 *     summary: Update the user profile
 *     tags:
 *       - User - Profile Management
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       description: The user's profile information to update.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: The user's first name.
 *               lastName:
 *                 type: string
 *                 description: The user's last name.
 *               bio:
 *                 type: string
 *                 description: A short biography of the user.
 *               linkedInUrl:
 *                 type: string
 *                 format: uri
 *                 description: The LinkedIn profile URL of the user.
 *               gender:
 *                 type: string
 *                 description: The user's gender. Should map to values in the `user_genders` table.
 *     responses:
 *       200:
 *         description: Successfully updated user profile.
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/UserProfile'
 */
router.put('/update', passwordCheck(false), async (req, res, next) => {
  try {
    const { userId } = req.user

    if (Object.keys(req.body).length === 0) {
      return res.status(422).send({
        resultCode: resultCodes.ERROR,
        message: req.t('user_error#profile_not_updated'),
      })
    }

    const { firstName, lastName, bio, linkedInUrl, gender } = req.body
    const fields = { firstName, lastName, bio, linkedInUrl, gender }

    await updateProfileTransaction(req.user, fields, userId)
    const result = getOne(await getUserProfile(userId))

    if (result) {
      return res.send(result)
    } else {
      return res.status(422).send({
        resultCode: resultCodes.ERROR,
        message: req.t('user_error#profile_not_updated'),
      })
    }
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Retrieve the full user profile
 *     tags:
 *       - User - Profile Management
 *     description: Fetches the profile details of the logged-in user.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req.user
    const result = getOne(await getUserProfile(userId))
    return res.send(result)
  } catch (err) {
    next(err)
  }
})

//  for Demo app only

/**
 * @swagger
 * /api/v1/users/profile/makeAdmin:
 *   post:
 *     summary: Promote a user to admin role. For demo purposes only. This should be removed from the production app
 *     tags:
 *       - User - Profile Management
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User successfully promoted to admin.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userInfo:
 *                   $ref: '#/components/schemas/UserInfo'
 *                 resultCode:
 *                   type: string
 *                   enum:
 *                     - SUCCESS
 */
router.post('/makeAdmin', async (req, res, next) => {
  try {
    const { userId, accountId } = req.user
    await insertData(req.user, 'user_to_role', { userId, roleId: userRoles.ADMIN_ROLE_ID })
    const userInfo = getOne(await getUserInfoByAccountId(accountId))
    return res.send({
      userInfo,
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
