const { query } = require('@utils/dbUtils')

const getUserRoleIds = (userId) => {
  const sql = `SELECT "roleId" FROM user_to_role                  
                 WHERE "userId" = $1 `
  const values = [userId]
  return query(sql, values)
}

// used when disabling 2FA to remove 2FA role
const removeRoleFromUser = (roleId, userId) => {
  const sql = 'DELETE FROM user_to_role WHERE "roleId" = $1 AND "userId" = $2'
  const values = [roleId, userId]
  return query(sql, values)
}

module.exports = {
  removeRoleFromUser,
  getUserRoleIds,
}
