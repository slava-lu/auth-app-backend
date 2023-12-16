const axios = require('axios')
const jwt = require('jsonwebtoken')
const { createOauthAccountTransaction } = require('./queries')
const { getUserInfoByEmail } = require('../authQueries')
const { getOne } = require('@utils/dbUtils')
const { resultCodes, loginProviders } = require('@utils/const')
const { getLoginOptions } = require('./helpers')

const oauthMiddleware = () => {
  return async (req, res, next) => {
    const { code, provider } = req.query

    try {
      const ifProviderExists = Object.values(loginProviders).includes(provider)
      if (!ifProviderExists) {
        return res.status(400).send({
          resultCode: resultCodes.ERROR,
          message: req.t('auth_error#oauth_provider_not_found'),
        })
      }

      const response = await axios(getLoginOptions(code, provider))
      const idToken = response?.data?.id_token

      const refresh_token = response?.data?.refresh_token
      const access_token = response?.data?.access_token

      if (!idToken) {
        return res.status(400).send({ message: req.t('auth_error#facebook_token_not_found') })
      }

      const decodedIdToken = jwt.decode(idToken)

      const { sub, email: emailRaw, given_name, family_name, name, picture } = decodedIdToken
      const email = emailRaw.toLowerCase()

      // some roles are not allowed to log in using social networks
      const userInfo = getOne(await getUserInfoByEmail(email))
      const roles = userInfo?.roles
      const { socialLoginNotAllowed } = req.app.get('config')

      if (socialLoginNotAllowed && roles) {
        for (const notAllowedRole of socialLoginNotAllowed) {
          if (roles.includes(notAllowedRole))
            return res.status(401).send({
              resultCode: resultCodes.ERROR,
              message: req.t('auth_error#no_social_network_login'),
            })
        }
      }

      const result = await createOauthAccountTransaction(
        provider,
        sub,
        email,
        given_name,
        family_name,
        name,
        picture,
        refresh_token,
        access_token,
      )

      req.user = result
      return next()
    } catch (err) {
      console.log('err', err)
      next(err)
    }
  }
}

module.exports = { oauthMiddleware: oauthMiddleware }
