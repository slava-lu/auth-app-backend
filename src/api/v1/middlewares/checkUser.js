// This is the main Auth middleware that checks that a user is authenticated, not banned, etc.

const { resultCodes, errorCodes, cookiesOption, LOGIN_ROUTES, CHANGE_PASSWORD_ROUTE } = require('@utils/const')
const { verifyToken } = require('../auth/authUtils')
const { getOne } = require('@utils/dbUtils')
const { getAccountInfo } = require('../auth/authQueries')

const checkUser = (checkEmail, checkMobile) => {
  return async (req, res, next) => {
    const pathname = req.originalUrl.split('?')[0]
    const doNotCheckJwt = LOGIN_ROUTES.includes(pathname)
    const doNotCheckPasswordChange = pathname === CHANGE_PASSWORD_ROUTE || LOGIN_ROUTES.includes(pathname)

    if (!doNotCheckJwt) {
      try {
        const jwt = verifyToken(req?.cookies?.jwt)
        if (!jwt) {
          return res.status(401).send({
            resultCode: resultCodes.ERROR,
            errorCode: errorCodes.TOKEN_NOT_FOUND,
            message: req.t('auth_error#token_not_found'),
          })
        }
        req.user = jwt
      } catch (err) {
        return res.status(401).send({
          resultCode: resultCodes.ERROR,
          message: req.t('auth_error#invalid_token'),
        })
      }
    }
    try {
      const currentUser = getOne(await getAccountInfo(req.user.accountId))
      if (!currentUser) {
        return res.status(401).send({
          resultCode: resultCodes.ERROR,
          errorCode: errorCodes.USER_NOT_FOUND,
          message: req.t('auth_error#user_not_found'),
        })
      }
      if (currentUser.isDeleted) {
        return res
          .status(401)
          .clearCookie('jwt', { ...cookiesOption })
          .send({
            resultCode: resultCodes.ERROR,
            errorCode: errorCodes.ACCOUNT_DEACTIVATED,
            message: req.t('auth_error#account_deactivated'),
          })
      }
      if (currentUser.passwordChangeRequired && !doNotCheckPasswordChange) {
        return res.status(401).send({
          resultCode: resultCodes.ERROR,
          errorCode: errorCodes.PASSWORD_CHANGE_REQUIRED,
          message: req.t('auth_error#password_change_required'),
        })
      }
      if (checkEmail && !currentUser.isEmailVerified) {
        return res.status(403).send({
          resultCode: resultCodes.ERROR,
          errorCode: errorCodes.EMAIL_NOT_VERIFIED,
          message: req.t('auth_error#email_not_verified'),
        })
      }
      if (checkMobile && !currentUser.isMobileVerified) {
        return res.status(403).send({
          resultCode: resultCodes.ERROR,
          errorCode: errorCodes.MOBILE_NOT_VERIFIED,
          message: req.t('auth_error#mobile_not_verified'),
        })
      }
      if (currentUser.isBanned) {
        return res
          .status(403)
          .clearCookie('jwt', { ...cookiesOption })
          .send({
            resultCode: resultCodes.ERROR,
            errorCode: errorCodes.USER_BANNED,
            message: req.t('auth_error#user_is_banned'),
          })
      }
      if (currentUser.hashCheck !== req.user.hashCheck) {
        return res
          .status(401)
          .clearCookie('jwt', { ...cookiesOption })
          .send({
            resultCode: resultCodes.ERROR,
            errorCode: errorCodes.NEW_LOGIN_REQUIRED,
            message: req.t('auth_error#new_login_required'),
          })
      }
      return next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = { checkUser }
