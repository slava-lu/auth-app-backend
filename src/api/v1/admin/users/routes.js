const express = require('express')
const crypto = require('crypto')
const { resultCodes, userRoles, SPECIAL_ROLE_IDS } = require('@utils/const')
const { getAll, getOne, updateData, insertData } = require('@utils/dbUtils')
const { removeRoleFromUser } = require('@common/queries')
const {
  getAllUsers,
  getUserDetailed,
  getCurrentUsers,
  getUserRoleIdsByAccountId,
  getUserIdByAccountId,
  getUserCount,
} = require('./queries')

const router = express.Router()

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     security:
 *       - cookieAuth: []
 *     tags:
 *       - Admin - User Management
 *     summary: Retrieve a list of all users or a subset based on the logged-in user's role
 *     description: >
 *       For the demo purpose to get all user a user needs to have the SUPER_ADMIN role.
 *       Otherwise, only the current user of the logged-in user will be returned. To be adapted in the real app.
 *     responses:
 *       200:
 *         description: Successful retrieval of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         description: Unique identifier for the user.
 *                       email:
 *                         type: string
 *                         format: email
 *                         description: User's email address.
 *                       isEmailVerified:
 *                         type: boolean
 *                         description: Indicates if the user's email has been verified.
 *                       isTwoFaEnabled:
 *                         type: boolean
 *                         description: Indicates if two-factor authentication is enabled for the user.
 *                       lastLoginAt:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp of the user's last login.
 *                       lastLoginProvider:
 *                         type: string
 *                         description: The provider used during the user's last login. *
 *                       firstName:
 *                         type: string
 *                         description: User's first name.
 *                       lastName:
 *                         type: string
 *                         description: User's last name.
 *                       roles:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: List of roles associated with the user.
 *                 resultCode:
 *                   type: string
 *                   enum: [SUCCESS]
 *                   description: Result code of the operation.
 *       400:
 *         $ref: '#/components/responses/400BadRequest'
 *       401:
 *         $ref: '#/components/responses/401Unauthorized'
 *       403:
 *         $ref: '#/components/responses/403Forbidden'
 *       404:
 *         $ref: '#/components/responses/404NotFound'
 */
router.get('/', async (req, res, next) => {
  const { accountId } = req.user
  const currentPage = parseInt(req.query.currentPage)
  const pageSize = parseInt(req.query.pageSize)
  const searchTerm = req.query.searchTerm.trim()
  const offset = (currentPage - 1) * pageSize

  try {
    const userRolesRaw = getAll(await getUserRoleIdsByAccountId(accountId)) || []
    const userRoleIds = userRolesRaw.map((role) => role.roleId)
    let users
    let totalNumberUsers
    if (userRoleIds.includes(userRoles.SUPER_ADMIN_ROLE_ID)) {
      totalNumberUsers = getOne(await getUserCount(searchTerm))
      users = getAll(await getAllUsers({ pageSize, offset, searchTerm }))
    } else {
      users = getAll(await getCurrentUsers(accountId))
    }
    res.send({
      totalNumberUsers: totalNumberUsers?.count || 0,
      users,
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/admin/users/{accountId}:
 *   get:
 *     security:
 *       - cookieAuth: []
 *     summary: Get detailed user information
 *     tags:
 *       - Admin - User Management
 *     parameters:
 *       - name: accountId
 *         in: path
 *         description: ID of the user account to retrieve
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Successfully retrieved the detailed user information.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDetailed'
 */
router.get('/:accountId', async (req, res, next) => {
  try {
    const { accountId } = req.params
    const userDetailed = getOne(await getUserDetailed(accountId))
    res.send({
      userDetailed,
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/admin/users/{accountId}/block:
 *   post:
 *     security:
 *       - cookieAuth: []
 *     tags:
 *       - Admin - User Management
 *     summary: Block or unblock a user
 *     description: Updates the block status of a user based on the provided block value in the request body.
 *     parameters:
 *       - name: accountId
 *         in: path
 *         description: Account ID of the user
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       description: Block information
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               block:
 *                 type: boolean
 *                 description: True if blocking the user, False if unblocking.
 *                 example: true
 *     responses:
 *       200:
 *         description: Successful update of user block status and retrieval of user details.
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/UserDetailed'
 */
router.post('/:accountId/block', async (req, res, next) => {
  try {
    const { block } = req.body
    const { accountId } = req.params
    await updateData(req.user, 'auth_accounts', { isBanned: block }, 'id', accountId)
    const userDetailed = getOne(await getUserDetailed(accountId))
    res.send({
      userDetailed,
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/admin/users/{accountId}/forcePasswordChange:
 *   post:
 *     tags:
 *       - Admin - User Management
 *     summary: Force a user to change the password on next login
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: accountId
 *         in: path
 *         description: Account ID of the user
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       description: User's email and the flag to indicate if the user should change the password.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               change:
 *                 type: boolean
 *                 description: True to force the user to change the password, false to revert the request.
 *     responses:
 *       200:
 *         description: Successful update of the user's "password change" status and retrieval of user details.
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/UserDetailed'
 */
router.post('/:accountId/forcePasswordChange', async (req, res, next) => {
  try {
    const { change } = req.body
    const { accountId } = req.params
    await updateData(req.user, 'auth_accounts', { passwordChangeRequired: change }, 'id', accountId)
    const userDetailed = getOne(await getUserDetailed(accountId))
    res.send({
      userDetailed,
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/admin/users/{accountId}/forceRelogin:
 *   post:
 *     tags:
 *       - Admin - User Management
 *     summary: Force a user to re-login by updating the hashCheck code
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: accountId
 *         in: path
 *         description: Account ID of the user
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Successful update of the user's session hash.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   enum: [SUCCESS]
 *                   description: Result code of the operation.
 */
router.post('/:accountId/forceRelogin', async (req, res, next) => {
  try {
    const { accountId } = req.params
    const hashCheck = crypto.randomBytes(16).toString('hex')
    await updateData(req.user, 'auth_accounts', { hashCheck }, 'id', accountId)
    res.send({
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/admin/users/{accountId}/assignRoles:
 *   post:
 *     security:
 *       - cookieAuth: []
 *     tags:
 *       - Admin - User Management
 *     summary: Assigns or removes roles to/from a user
 *     parameters:
 *       - name: accountId
 *         in: path
 *         description: User ID of the user
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *         required: true
 *         content:
 *           application/json:
 *            schema:
 *              type: object
 *              properties:
 *                rolesId:
 *                  type: array
 *                  items:
 *                    type: number
 *                  description: Array of role IDs to be assigned to the user.
 *     responses:
 *       200:
 *         description: Roles were successfully assigned/removed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDetailed'
 */
router.post('/:accountId/assignRoles', async (req, res, next) => {
  try {
    const { rolesId: newRoles } = req.body
    const { accountId } = req.params

    if (!Array.isArray(newRoles)) {
      return res.status(400).send({
        resultCode: resultCodes.ERROR,
        message: req.t('admin_error#not_an_array'),
      })
    }

    if (!accountId) {
      return res.status(404).send({
        resultCode: resultCodes.ERROR,
        message: req.t('admin_error#user_not_found'),
      })
    }

    const currentRoles = getAll(await getUserRoleIdsByAccountId(accountId)).map((role) => role.roleId)

    const rolesToAdd = newRoles
      .filter((role) => !currentRoles.includes(role))
      .filter((role) => !SPECIAL_ROLE_IDS.includes(role))
    const rolesToRemove = currentRoles
      .filter((role) => !newRoles.includes(role))
      .filter((role) => !SPECIAL_ROLE_IDS.includes(role))

    if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
      return res.status(400).send({
        resultCode: resultCodes.ERROR,
        message: req.t('admin_error#roles_not_changed'),
      })
    }
    const { id: userId } = getOne(await getUserIdByAccountId(accountId))
    for (const roleId of rolesToAdd) {
      await insertData(req.user, 'user_to_role', { userId, roleId })
    }

    for (const roleId of rolesToRemove) {
      await removeRoleFromUser(roleId, userId)
    }
    const userDetailed = getOne(await getUserDetailed(accountId))
    res.send({
      userDetailed,
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
