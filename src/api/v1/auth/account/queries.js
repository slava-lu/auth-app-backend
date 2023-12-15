const { query, pool } = require('@utils/dbUtils')
const { database, loginProviders } = require('@utils/const')
const { getOne, insertDataTrans } = require('@utils/dbUtils')

const getAccountRestoreCode = (accountId) => {
  const sql = 'SELECT "accountRestoreCode" FROM auth_accounts WHERE id = $1'
  const values = [accountId]
  return query(sql, values)
}

// for email verification
const getEmailVerificationCode = (accountId) => {
  const sql = 'SELECT "emailVerificationCode", email FROM auth_accounts WHERE id = $1'
  const values = [accountId]
  return query(sql, values)
}

// to create account, user and profile record
const createAccountTransaction = async ({
  email,
  emailVerificationCode,
  mobilePhone,
  passwordHash,
  salt,
  hashCheck,
  firstName,
  lastName,
  isCreatedLocally,
}) => {
  const client = await pool.connect()
  const queryTr = (request, values) => client.query(request, values)
  const ct = new Date()
  const user = { accountId: 0 }
  try {
    await queryTr(database.BEGIN)
    const { id: accountId } = getOne(
      await insertDataTrans(
        queryTr,
        user,
        'auth_accounts',
        {
          email,
          emailVerificationCode,
          mobilePhone,
          passwordHash,
          salt,
          hashCheck,
          isCreatedLocally,
          lastLoginAt: ct,
          lastLoginProvider: loginProviders.LOCAL,
        },
        'id'
      )
    )
    user.accountId = accountId
    const { id: userId } = getOne(
      await insertDataTrans(queryTr, user, 'auth_users', { firstName, lastName, accountId }, 'id')
    )

    await insertDataTrans(queryTr, user, 'user_profile', { userId })

    await queryTr(database.COMMIT)
    return { accountId, userId }
  } catch (err) {
    await queryTr(database.ROLLBACK)
    throw err
  } finally {
    client.release()
  }
}

module.exports = {
  createAccountTransaction,
  getEmailVerificationCode,
  getAccountRestoreCode,
}
