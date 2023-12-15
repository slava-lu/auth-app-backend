const express = require('express')
const { checkUser } = require('@middlewares')
const { userRoles } = require('@utils/const')
const { getAll } = require('@utils/dbUtils')
const { getRoles } = require('./queries')
const { version } = require('@root/package.json')

const router = express.Router()

/**
 * @swagger
 * /api/v1/system/getApiVersion:
 *   get:
 *     summary: Retrieve REST API version
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Returns non-secure configuration information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiVersion:
 *                   type: string
 *                   description: The version of the API.
 */
router.get('/getApiVersion', async (req, res, next) => {
  try {
    res.send({
      apiVersion: version,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/system/configOption:
 *   get:
 *     summary: Retrieve non-secure config information
 *     tags:
 *       - System
 *     description: Provides non-secure configuration information including a list of roles (excluding hidden roles) and application configuration.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Returns non-secure configuration information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   description: A list of roles (excluding hidden roles like SUPER_ADMIN and TWO_FA).
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: The ID of the role.
 *                       name:
 *                         type: string
 *                         description: The name of the role.
 *                 config:
 *                   type: object
 *                   description: Application configuration.
 */
router.get('/configOption', checkUser(), async (req, res, next) => {
  try {
    const hiddenRoles = [userRoles.SUPER_ADMIN_ROLE_ID, userRoles.TWO_FA_ROLE_ID]
    const roles = getAll(await getRoles())
    const config = req.app.get('config')
    res.send({
      roles: roles.filter((role) => !hiddenRoles.includes(role.id)),
      config,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
