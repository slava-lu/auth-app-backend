// AWS health check route

const express = require('express')
const { resultCodes } = require('@utils/const')
const router = express.Router()

router.get('/', (req, res) => {
  res.send({
    resultCode: resultCodes.SUCCESS,
  })
})
module.exports = router
