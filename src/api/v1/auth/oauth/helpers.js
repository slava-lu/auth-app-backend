const {
  loginProviders,
  FACEBOOK_REDIRECT_URI_LOCAL,
  FACEBOOK_REDIRECT_URI_PROD,
  GOOGLE_REDIRECT_URI_LOCAL,
  GOOGLE_REDIRECT_URI_PROD,
  LINKEDIN_REDIRECT_URI_LOCAL,
  LINKEDIN_REDIRECT_URI_PROD,
} = require('@utils/const')

const getLoginOptions = (code, provider) => {
  const facebookParameters = {
    url: 'https://graph.facebook.com/v18.0/oauth/access_token',
    method: 'GET',
    params: {
      client_id: process.env.FACEBOOK_CLIENT_ID,
      client_secret: process.env.FACEBOOK_CLIENT_SECRET,
      redirect_uri: process.env.NODE_ENV === 'development' ? FACEBOOK_REDIRECT_URI_LOCAL : FACEBOOK_REDIRECT_URI_PROD,
      code,
    },
  }

  const googleParameters = {
    url: 'https://oauth2.googleapis.com/token',
    method: 'POST',
    data: {
      grant_type: 'authorization_code',
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.NODE_ENV === 'development' ? GOOGLE_REDIRECT_URI_LOCAL : GOOGLE_REDIRECT_URI_PROD,
      code,
    },
  }

  const linkedInParameters = {
    url: 'https://www.linkedin.com/oauth/v2/accessToken',
    method: 'POST',
    data: {
      grant_type: 'authorization_code',
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      redirect_uri: process.env.NODE_ENV === 'development' ? LINKEDIN_REDIRECT_URI_LOCAL : LINKEDIN_REDIRECT_URI_PROD,
      code,
    },
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
  }

  if (provider === loginProviders.FACEBOOK) return facebookParameters
  if (provider === loginProviders.GOOGLE) return googleParameters
  if (provider === loginProviders.LINKEDIN) return linkedInParameters
}

const getLogoutOptions = (userId, provider, token) => {
  const facebookAccessToken = `${process.env.FACEBOOK_CLIENT_ID}|${process.env.FACEBOOK_CLIENT_SECRET}`
  const facebookParameters = {
    url: `https://graph.facebook.com/v18.0/${userId}/permissions`,
    method: 'DELETE',
    params: { access_token: facebookAccessToken },
  }

  const googleParameters = {
    url: 'https://oauth2.googleapis.com/revoke',
    method: 'POST',
    params: { token },
  }

  const linkedInParameters = {
    url: 'https://api.linkedin.com/oauth/v2/revoke',
    method: 'POST',
    data: {
      token,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    },
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
  }

  if (provider === loginProviders.FACEBOOK) return facebookParameters
  if (provider === loginProviders.GOOGLE) return googleParameters
  if (loginProviders.LINKEDIN) return linkedInParameters
}

module.exports = { getLoginOptions, getLogoutOptions }
