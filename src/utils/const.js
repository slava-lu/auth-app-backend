const DOMAIN = 'authdemoapp.com'

// where frontend requests with local development come from
const LOCAL_DOMAIN = 'http://localhost:4000'

// accepts domain with and without www, https only
const pattern = `^https:\\/\\/(?:www\\.)?${DOMAIN.replace('.', '\\.')}$`
const corsRegexp = new RegExp(pattern)
const CORS_ORIGIN = [corsRegexp, LOCAL_DOMAIN]

const BASE_URL = process.env.NODE_ENV === 'development' ? LOCAL_DOMAIN : `https://${DOMAIN}`
const NO_REPLY_FROM = `no-reply@${DOMAIN}`

const FACEBOOK_REDIRECT_URI_SUFFIX = '/auth/oauthCallback/facebook'
const FACEBOOK_REDIRECT_URI_LOCAL = `${LOCAL_DOMAIN}${FACEBOOK_REDIRECT_URI_SUFFIX}`
const FACEBOOK_REDIRECT_URI_PROD = `https://${DOMAIN}${FACEBOOK_REDIRECT_URI_SUFFIX}`

const GOOGLE_REDIRECT_URI_SUFFIX = '/auth/oauthCallback/google'
const GOOGLE_REDIRECT_URI_LOCAL = `${LOCAL_DOMAIN}${GOOGLE_REDIRECT_URI_SUFFIX}`
const GOOGLE_REDIRECT_URI_PROD = `https://${DOMAIN}${GOOGLE_REDIRECT_URI_SUFFIX}`

const LINKEDIN_REDIRECT_URI_SUFFIX = '/auth/oauthCallback/linkedin'
const LINKEDIN_REDIRECT_URI_LOCAL = `${LOCAL_DOMAIN}${LINKEDIN_REDIRECT_URI_SUFFIX}`
const LINKEDIN_REDIRECT_URI_PROD = `https://${DOMAIN}${LINKEDIN_REDIRECT_URI_SUFFIX}`

const LOGIN_ROUTES = ['/api/v1/auth/login/local', '/api/v1/auth/oauth/loginOauth']
const CHANGE_PASSWORD_ROUTE = '/api/v1/auth/password/change'
const OTP_CODE_CHECK_ROUTE = '/api/v1/auth/2fa/checkCode'

const cookiesOption = {
  domain: process.env.NODE_ENV === 'development' ? 'localhost' : DOMAIN,
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV !== 'development',
}

const links = {
  EMAIL_VERIFICATION_LINK: `${BASE_URL}/auth/emailVerification`,
  PASSWORD_RESET_LINK: `${BASE_URL}/auth/passwordReset`,
  ACCOUNT_RESTORE_LINK: `${BASE_URL}/auth/restoreAccount`,
}

// PASSWORD_RESET_LINK_VALID_TIME - reset link is valid for 24 hours
const times = {
  PASSWORD_RESET_LINK_VALID_TIME: 24 * 60 * 60 * 1000,
}

const loginProviders = {
  LOCAL: 'local',
  FACEBOOK: 'facebook',
  GOOGLE: 'google',
  LINKEDIN: 'linkedin',
}

const database = {
  BEGIN: 'BEGIN',
  COMMIT: 'COMMIT',
  ROLLBACK: 'ROLLBACK',
}

const resultCodes = {
  SUCCESS: 'success',
  ERROR: 'error',
  OTP_REQUIRED: 'otpRequired',
  PASSWORD_VALIDATION_REQUIRED: 'PASSWORD_VALIDATION_REQUIRED',
}

const errorCodes = {
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PASSWORD_CHANGE_REQUIRED: 'PASSWORD_CHANGE_REQUIRED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  MOBILE_NOT_VERIFIED: 'MOBILE_NOT_VERIFIED',
  USER_BANNED: 'USER_BANNED',
  NEW_LOGIN_REQUIRED: 'NEW_LOGIN_REQUIRED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  WRONG_CODE: 'WRONG_CODE',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  MOBILE_EXISTS: 'MOBILE_EXISTS',
  PASSWORD_RESET_LINK_INVALID: 'PASSWORD_RESET_LINK_INVALID',
  PASSWORD_RESET_LINK_EXPIRED: 'PASSWORD_RESET_LINK_EXPIRED',
  VERIFICATION_CODE_NOT_FOUND: 'VERIFICATION_CODE_NOT_FOUND',
  VERIFICATION_CODE_IS_NOT_CORRECT: 'VERIFICATION_CODE_IS_NOT_CORRECT',
  OLD_PASSWORD_IS_NOT_CORRECT: 'OLD_PASSWORD_IS_NOT_CORRECT',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  PASSWORD_CHECK_FAILED: 'PASSWORD_CHECK_FAILED',
  ACCOUNT_RESTORE_LINK_INVALID: 'ACCOUNT_RESTORE_LINK_INVALID',
}

const userRoles = {
  SUPER_ADMIN_ROLE_NAME: 'superadmin',
  ADMIN_ROLE_NAME: 'admin',
  TWO_FA_ROLE_NAME: '2fa',
  IMPERSONATION_ROLE_NAME: 'impersonation',
  SUPER_ADMIN_ROLE_ID: 100,
  ADMIN_ROLE_ID: 200,
  TWO_FA_ROLE_ID: 300,
  IMPERSONATION_ROLE_ID: 500,
}

module.exports = {
  database,
  resultCodes,
  errorCodes,
  links,
  times,
  cookiesOption,
  userRoles,
  loginProviders,
  CORS_ORIGIN,
  NO_REPLY_FROM,
  FACEBOOK_REDIRECT_URI_LOCAL,
  FACEBOOK_REDIRECT_URI_PROD,
  GOOGLE_REDIRECT_URI_LOCAL,
  GOOGLE_REDIRECT_URI_PROD,
  LINKEDIN_REDIRECT_URI_LOCAL,
  LINKEDIN_REDIRECT_URI_PROD,
  LOGIN_ROUTES,
  CHANGE_PASSWORD_ROUTE,
  OTP_CODE_CHECK_ROUTE,
}
