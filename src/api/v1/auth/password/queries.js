const { query } = require('@utils/dbUtils')

const getPasswordResetCode = (email) => {
  const sql = 'SELECT id, "passwordResetCode", "passwordResetAt" FROM auth_accounts WHERE email = $1'
  const values = [email]
  return query(sql, values)
}

module.exports = {
  getPasswordResetCode,
}
