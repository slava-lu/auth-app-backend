const { query } = require('@utils/dbUtils')

const getUserCount = (searchTerm) => {
  let sql = `SELECT  COUNT(*)                       
             FROM  auth_accounts a
              JOIN auth_users u ON u."accountId" = a.id `
  if (searchTerm) {
    sql += ` WHERE 
            u."firstName" ILIKE $1
         OR u."lastName" ILIKE $1
         OR a.email ILIKE $1      
         `
  }
  const values = searchTerm ? [`%${searchTerm}%`] : []
  return query(sql, values)
}

const getAllUsers = ({ pageSize, offset, searchTerm }) => {
  let sql = `SELECT  a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", a."lastLoginProvider",
                        a.id, u."firstName", u."lastName",
                       COALESCE(ARRAY_AGG (r."name") FILTER (WHERE r."name" IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
             FROM  auth_accounts a
              JOIN auth_users u ON u."accountId" = a.id  
              LEFT JOIN user_to_role ur ON u.id = ur."userId"
              LEFT JOIN auth_roles r ON r.id = ur."roleId" `

  if (searchTerm) {
    sql += `WHERE 
            u."firstName" ILIKE $3
         OR u."lastName" ILIKE $3
         OR a.email ILIKE $3 `
  }
  sql += ` GROUP BY a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", 
              a."lastLoginProvider", a.id, u."firstName", u."lastName"
              ORDER BY a.id LIMIT $1 OFFSET $2`

  const values = searchTerm ? [pageSize, offset, `%${searchTerm}%`] : [pageSize, offset]
  return query(sql, values)
}

const getCurrentUsers = (accountId) => {
  const sql = `SELECT  a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", a."lastLoginProvider",
                       a.id, u."firstName", u."lastName",
                       COALESCE(ARRAY_AGG (r."name") FILTER (WHERE r."name" IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
             FROM  auth_accounts a
              JOIN auth_users u ON u."accountId" = a.id  
              LEFT JOIN user_to_role ur ON u.id = ur."userId"
              LEFT JOIN auth_roles r ON r.id = ur."roleId"
              WHERE a.id = $1
              GROUP BY a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", 
              a."lastLoginProvider", a.id, u."firstName", u."lastName"`
  const values = [accountId]
  return query(sql, values)
}

const getUserDetailed = (accountId) => {
  const sql = `SELECT  a.id AS "accountId", a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", a."lastLoginProvider",
                       a."isBanned", a."passwordChangeRequired",
                       u."firstName", u."lastName", u.id AS "userId",
                       COALESCE(ARRAY_AGG (r."name") FILTER (WHERE r."name" IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
               FROM  auth_accounts a
                       JOIN auth_users u ON u."accountId" = a.id
                       LEFT JOIN user_to_role ur ON u.id = ur."userId"
                       LEFT JOIN auth_roles r ON r.id = ur."roleId"
               WHERE a.id = $1
               GROUP BY a.id, a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt",
                        a."lastLoginProvider", u."firstName", u."lastName", u.id, a."isBanned", a."passwordChangeRequired"`
  const values = [accountId]
  return query(sql, values)
}

const getUserRoleIdsByAccountId = (accountId) => {
  const sql = `SELECT "roleId" FROM user_to_role ur
                  JOIN auth_users u ON ur."userId" = u."id"
                 WHERE u."accountId" = $1`
  const values = [accountId]
  return query(sql, values)
}

const getUserIdByAccountId = (accountId) => {
  const sql = `SELECT "id" FROM auth_users                  
                 WHERE "accountId" = $1`
  const values = [accountId]
  return query(sql, values)
}

module.exports = {
  getAllUsers,
  getUserCount,
  getUserDetailed,
  getUserRoleIdsByAccountId,
  getCurrentUsers,
  getUserIdByAccountId,
}
