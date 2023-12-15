// This middleware checks if 2FA is enabled and initiates the second step of the code check before logging a user in.
// Also, if oneLoginOnly features is enabled, it is enforced by changing the hashCheck code in the accounts table.

const crypto = require('crypto')
const { updateData, getOne } = require('@utils/dbUtils')
const { calculateRandomString } = require('../auth/authUtils')
const { resultCodes, OTP_CODE_CHECK_ROUTE } = require('@utils/const')
const { getUserInfoByTwoFaCode } = require('../auth/2fa/queries')

const postLogin = () => {
  return async (req, res, next) => {
    try {
      if (req.user?.isTwoFaEnabled) {
        const twoFaCode = calculateRandomString()
        await updateData(req.user, 'auth_accounts', { twoFaCode }, 'id', req.user.accountId)

        // send request to provide OTP token
        return res.send({
          resultCode: resultCodes.OTP_REQUIRED,
          twoFaCode,
        })
      }
      // if we require a user to be able to log in only from one device we change the hashCheck here
      const { oneLoginOnly } = req.app.get('config')
      if (oneLoginOnly) {
        const pathname = req.originalUrl.split('?')[0]
        if (pathname === OTP_CODE_CHECK_ROUTE) {
          const { twoFaCode } = req.body
          const { accountId } = getOne(await getUserInfoByTwoFaCode(twoFaCode))
          req.user = { accountId }
        }
        const hashCheck = crypto.randomBytes(16).toString('hex')
        await updateData(req.user, 'auth_accounts', { hashCheck }, 'id', req.user.accountId)
        req.user.hashCheck = hashCheck
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = { postLogin }
