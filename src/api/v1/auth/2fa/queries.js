const { query } = require('@utils/dbUtils')

// for 2FA verification
const getUserInfoByTwoFaCode = (code) => {
  const sql = `SELECT  a.id as "accountId", a."hashCheck",  a."isTwoFaEnabled", a."twoFaSecret" as secret, u.id as "userId"
              FROM  auth_accounts a
              INNER JOIN auth_users u ON u."accountId" = a.id                            
              WHERE a."twoFaCode" = $1`
  const values = [code]
  return query(sql, values)
}

// for 2FA verification
const getTwoFaSecret = (accountId) => {
  const sql = 'SELECT "twoFaSecret" FROM auth_accounts WHERE id = $1'
  const values = [accountId]
  return query(sql, values)
}

module.exports = {
  getUserInfoByTwoFaCode,
  getTwoFaSecret,
}
