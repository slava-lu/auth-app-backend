const express = require('express')
const router = express.Router()
const auth = require('./auth')
const admin = require('./admin')
const users = require('./users')
const system = require('./system/routes')
const { checkUser, checkRoles } = require('@middlewares')
const { userRoles } = require('@utils/const')

const adminRole = userRoles.ADMIN_ROLE_NAME

// checkUser(checkEmail, checkMobile)
// checkRoles(roles), roles - string of a single role or array of roles

router.use('/auth', auth)
router.use('/system', system)
router.use('/users', checkUser(), users)
router.use('/admin', checkUser(), checkRoles([adminRole]), admin)

module.exports = router
