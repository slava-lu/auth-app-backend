const { resultCodes, errorCodes, loginProviders } = require('@utils/const')
const { checkPassword } = require('../authUtils')
const { getOne, updateData } = require('@utils/dbUtils')
const { getUserData } = require('../authQueries')
const { validatePassword } = require('@utils/helpers')

const localAuth = async (req, res, next) => {
  const ct = new Date()
  try {
    const { email, mobilePhone, password } = req.body

    const validationResult = validatePassword(password)
    if (validationResult) {
      return res.status(400).send({
        resultCode: resultCodes.ERROR,
        message: req.t(validationResult),
      })
    }
    const result = getOne(await getUserData(email, mobilePhone))
    if (result) {
      const { passwordHash, salt, accountId } = result
      const user = { accountId }
      const isPasswordCorrect = checkPassword(password, passwordHash, salt)
      if (isPasswordCorrect) {
        await updateData(
          user,
          'auth_accounts',
          { lastLoginAt: ct, lastLoginProvider: loginProviders.LOCAL },
          'id',
          accountId,
        )
        req.user = result
        next()
      } else {
        return res.status(403).send({
          resultCode: resultCodes.ERROR,
          errorCode: errorCodes.LOGIN_FAILED,
          message: req.t('auth_error#login_failed'),
        })
      }
    } else {
      return res.status(403).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.LOGIN_FAILED,
        message: req.t('auth_error#login_failed'),
      })
    }
  } catch (err) {
    next(err)
  }
}

module.exports = { localAuth }
