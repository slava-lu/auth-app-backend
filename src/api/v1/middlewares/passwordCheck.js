// This middleware intercepts the original API call and if no password field is present
// responds with the password request. Proper handling of this response is required at the frontend side.

const { resultCodes, errorCodes } = require('@utils/const')
const { checkPassword } = require('../auth/authUtils')
const { getOne } = require('@utils/dbUtils')
const { getPasswordByAccount } = require('../auth/authQueries')

const passwordCheck = (shouldRun) => {
  return async (req, res, next) => {
    if (shouldRun === false) {
      return next()
    }
    try {
      const { password } = req.body
      if (!password) {
        return res.send({
          resultCode: resultCodes.PASSWORD_VALIDATION_REQUIRED,
          data: req.body,
        })
      }
      const accountId = req?.user?.accountId
      const { passwordHash, salt } = getOne(await getPasswordByAccount(accountId))
      const isPasswordCorrect = checkPassword(password, passwordHash, salt)
      if (isPasswordCorrect) {
        return next()
      } else {
        return res.status(401).send({
          resultCode: resultCodes.ERROR,
          errorCode: errorCodes.PASSWORD_CHECK_FAILED,
          message: req.t('auth_error#password_check_failed'),
        })
      }
    } catch (err) {
      next(err)
    }
  }
}

module.exports = { passwordCheck }
