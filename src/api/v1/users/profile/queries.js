const { query, pool } = require('@utils/dbUtils')
const { database } = require('@utils/const')
const { updateDataTrans, getOne } = require('@utils/dbUtils')

// if logged in via oauth, get oauth profile info
const getOauthProfile = (email, provider) => {
  const sql =
    'SELECT email, given_name, family_name, name, picture, user_id FROM auth_oauth WHERE "email" = $1 AND provider = $2'
  const values = [email, provider]
  return query(sql, values)
}

const getUserProfile = async (userId) => {
  const sql = `SELECT 
               up."birthday", up."bio", up."linkedInUrl", 
               au."firstName", au."lastName", au."middleName", au."isVerified", 
               ug.name as gender
               FROM user_profile AS up
               INNER JOIN  auth_users AS au  ON up."userId" = au.id
               LEFT JOIN user_genders AS ug ON ug.id = up."genderId"              
               WHERE "userId" = $1`
  const values = [userId]
  return query(sql, values)
}

// this is in order not to keep the  mapping between IDs and Names in Frontend
// FE works with gender names, we save IDs in backend
const getGenderId = async (genderName) => {
  const sql = 'SELECT id FROM user_genders WHERE name= $1'
  const values = [genderName]
  return query(sql, values)
}

const updateProfileTransaction = async (user, fields, userId) => {
  const client = await pool.connect()
  const queryTr = (request, values) => client.query(request, values)
  const { firstName, lastName, bio, linkedInUrl, gender } = fields
  try {
    await queryTr(database.BEGIN)
    if (firstName || lastName) {
      await updateDataTrans(queryTr, user, 'auth_users', { firstName, lastName }, 'id', userId)
    }
    if (bio || linkedInUrl || gender) {
      const profileFields = { bio, linkedInUrl }
      if (gender && gender !== 'none') {
        const { id } = getOne(await getGenderId(gender))
        profileFields.genderId = parseInt(id)
      }
      if (gender && gender === 'none') {
        profileFields.genderId = null
      }

      await updateDataTrans(queryTr, user, 'user_profile', profileFields, 'userId', parseInt(userId))
    }
    await queryTr(database.COMMIT)
    return true
  } catch (err) {
    await queryTr(database.ROLLBACK)
    throw err
  } finally {
    client.release()
  }
}

// userInfo to show in a header that also defines access rights a user has but by userID
// useful with  impersonation, when userId belongs to a different user.
const getUserInfoByUserId = (userId) => {
  const sql = `SELECT  a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", a."lastLoginProvider",
                        u."firstName", u."lastName",
                       COALESCE(ARRAY_AGG (r."name") FILTER (WHERE r."name" IS NOT NULL), ARRAY[]::VARCHAR[]) as roles
             FROM  auth_accounts a
              JOIN auth_users u ON u."accountId" = a.id  
              LEFT JOIN user_to_role ur ON u.id = ur."userId"
              LEFT JOIN auth_roles r ON r.id = ur."roleId"
              WHERE u.id = $1
              GROUP BY a.email, a."isEmailVerified", a."isTwoFaEnabled", a."lastLoginAt", 
              a."lastLoginProvider", u."firstName", u."lastName"`
  const values = [userId]
  return query(sql, values)
}

module.exports = { getUserProfile, updateProfileTransaction, getOauthProfile, getUserInfoByUserId }
