const { query } = require('@utils/dbUtils')

// simple query to get a basic account info for checking
const getAccountInfo = (accountId) => {
  const sql = `SELECT "passwordHash", salt, "isEmailVerified", "isMobileVerified", "passwordChangeRequired", "hashCheck",
                       "isBanned", "isDeleted", "isTwoFaEnabled"
               FROM auth_accounts WHERE "id" = $1`
  const values = [accountId]
  return query(sql, values)
}

// getting user data with for authentication purposes
const getUserData = (email, mobilePhone) => {
  const sql = `SELECT a.id as "accountId",  a."passwordHash", a."hashCheck", a.salt, a.email, a."isTwoFaEnabled",
                      a."twoFaSecret",  u.id as "userId"
                FROM  auth_accounts a
                  INNER JOIN auth_users u
                  ON u."accountId" = a.id  WHERE a.email = $1 OR a."mobilePhone" = $2`
  const values = [email, mobilePhone]
  return query(sql, values)
}

// userInfo to show in a header that also defines access rights a user has
const getUserInfoByAccountId = (accountId) => {
  const sql = `SELECT  a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", a."lastLoginProvider",
                        u."firstName", u."lastName",
                       COALESCE(ARRAY_AGG (r."name") FILTER (WHERE r."name" IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
             FROM  auth_accounts a
              JOIN auth_users u ON u."accountId" = a.id  
              LEFT JOIN user_to_role ur ON u.id = ur."userId"
              LEFT JOIN auth_roles r ON r.id = ur."roleId"
              WHERE a.id = $1
              GROUP BY a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", 
              a."lastLoginProvider", u."firstName", u."lastName"`
  const values = [accountId]
  return query(sql, values)
}

// used in social logins, when we have only user email
const getUserInfoByEmail = (email) => {
  const sql = `SELECT  a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", a."lastLoginProvider",
                        u."firstName", u."lastName",
                       COALESCE(ARRAY_AGG (r."name") FILTER (WHERE r."name" IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
             FROM  auth_accounts a
              JOIN auth_users u ON u."accountId" = a.id  
              LEFT JOIN user_to_role ur ON u.id = ur."userId"
              LEFT JOIN auth_roles r ON r.id = ur."roleId"
              WHERE a.email = $1
              GROUP BY a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", 
              a."lastLoginProvider", u."firstName", u."lastName"`
  const values = [email]
  return query(sql, values)
}

// checks if an account has been created already when logging in via oauth (Facebook)
const getAccountId = (email) => {
  const sql = 'SELECT id as "accountId", "isTwoFaEnabled" FROM auth_accounts WHERE email = $1'
  const values = [email]
  return query(sql, values)
}

const checkIfEmailExists = (email) => {
  const sql = 'SELECT id FROM auth_accounts WHERE email = $1'
  const values = [email]
  return query(sql, values)
}

const checkIfMobileExists = (mobilePhone) => {
  const sql = 'SELECT id FROM auth_accounts WHERE "mobilePhone" = $1'
  const values = [mobilePhone]
  return query(sql, values)
}

// for password helpers in password change and extra verification routes
const getPasswordByAccount = (accountId) => {
  const sql = 'SELECT "passwordHash", "salt" FROM auth_accounts WHERE id = $1'
  const values = [accountId]
  return query(sql, values)
}

module.exports = {
  checkIfEmailExists,
  checkIfMobileExists,
  getUserData,
  getAccountId,
  getAccountInfo,
  getUserInfoByAccountId,
  getUserInfoByEmail,
  getPasswordByAccount,
}
