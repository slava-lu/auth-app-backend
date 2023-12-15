/* eslint camelcase: "off" */

const crypto = require('crypto')
const axios = require('axios')
const { query, pool } = require('@utils/dbUtils')
const { database } = require('@utils/const')
const { getOne, insertDataTrans, updateDataTrans } = require('@utils/dbUtils')
const { getAccountId, getUserData } = require('../authQueries')
const { createAccountTransaction } = require('../account/queries')

const checkProviderEntryExists = (email, provider) => {
  const sql = 'SELECT "id" FROM auth_oauth WHERE email = $1 AND provider = $2'
  const values = [email, provider]
  return query(sql, values)
}

const getTokens = (userId) => {
  const sql = 'SELECT refresh_token, access_token FROM auth_oauth WHERE user_id = $1'
  const values = [userId]
  return query(sql, values)
}

// the transaction is complex because we may create initial account via oauth,
// or link existing account to the oauth login

// we keep the column names as received by facebook API
// we need refresh_token only for Google to revoke access
const createOauthAccountTransaction = async (
  provider,
  sub,
  email,
  given_name,
  family_name,
  name,
  picture,
  refresh_token,
  access_token
) => {
  const client = await pool.connect()
  const queryTr = (request, values) => client.query(request, values)
  const ct = new Date()
  try {
    await queryTr(database.BEGIN)
    // check if main account with password already exist. If exists, update the account table with oauth info
    let { accountId } = getOne(await getAccountId(email))
    if (!accountId) {
      // if main account with password does not exist
      const salt = crypto.randomBytes(16).toString('hex')
      const hashCheck = crypto.randomBytes(16).toString('hex')
      const passwordHash = crypto.randomBytes(16).toString('hex')

      const firstName = given_name
      const lastName = family_name
      const emailVerificationCode = ''
      const mobilePhone = ''
      const isCreatedLocally = false
      const result = await createAccountTransaction({
        email,
        emailVerificationCode,
        mobilePhone,
        passwordHash,
        salt,
        hashCheck,
        firstName,
        lastName,
        isCreatedLocally,
      })
      accountId = result?.accountId
    }
    const user = { accountId }
    const { id } = getOne(await checkProviderEntryExists(email, provider))
    if (!id) {
      // create facebook entry
      const { data } = await axios
        .get(picture, {
          responseType: 'arraybuffer',
        })
        .catch((error) => {
          console.error(error)
          return { data: null }
        })
      const base64ImageData = data ? Buffer.from(data, 'binary').toString('base64') : ''
      const { id: insertedId } = getOne(
        await insertDataTrans(
          queryTr,
          user,
          'auth_oauth',
          {
            provider,
            accountId,
            user_id: sub,
            email,
            given_name,
            family_name,
            name,
            picture: base64ImageData,
          },
          'id'
        )
      )
      await updateDataTrans(queryTr, user, 'auth_accounts', { isEmailVerified: true }, 'email', email)
      if (refresh_token) {
        await updateDataTrans(queryTr, user, 'auth_oauth', { refresh_token }, 'id', insertedId)
      }
      if (access_token) {
        await updateDataTrans(queryTr, user, 'auth_oauth', { access_token }, 'id', insertedId)
      }
    } else {
      const { data } = await axios
        .get(picture, {
          responseType: 'arraybuffer',
        })
        .catch((error) => {
          console.error(error)
          return { data: null }
        })
      const base64ImageData = data ? Buffer.from(data, 'binary').toString('base64') : ''

      await updateDataTrans(
        queryTr,
        user,
        'auth_oauth',
        { given_name, family_name, name, picture: base64ImageData },
        'id',
        id
      )
    }
    await updateDataTrans(
      queryTr,
      user,
      'auth_accounts',
      { lastLoginAt: ct, lastLoginProvider: provider },
      'email',
      email
    )

    if (id && refresh_token) {
      await updateDataTrans(queryTr, user, 'auth_oauth', { refresh_token }, 'id', id)
    }
    if (id && access_token) {
      await updateDataTrans(queryTr, user, 'auth_oauth', { access_token }, 'id', id)
    }

    await queryTr(database.COMMIT)
    return getOne(await getUserData(email))
  } catch (err) {
    await queryTr(database.ROLLBACK)
    throw err
  } finally {
    client.release()
  }
}

module.exports = {
  createOauthAccountTransaction,
  getTokens,
}
