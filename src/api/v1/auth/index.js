const express = require('express')
const router = express.Router()

const login = require('./login/routes')
const password = require('./password/routes')
const account = require('./account/routes')
const twoFa = require('./2fa/routes')
const oAuth = require('./oauth/routes')

router.use('/login', login)
router.use('/password', password)
router.use('/accounts', account)
router.use('/2fa', twoFa)
router.use('/oauth', oAuth)

module.exports = router
