const express = require('express')
const mainRoutes = require('./v1')
const health = require('./health')

const router = express.Router()

router.use('/v1', mainRoutes)
router.use('/health', health)

module.exports = router
