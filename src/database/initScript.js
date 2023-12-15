// running this script will drop all the tables!
require('module-alias/register')
const fs = require('fs').promises
const { pool } = require('@utils/dbUtils')
const { database, loginProviders } = require('@utils/const')
const crypto = require('crypto')
const { calculateHash } = require('../api/v1/auth/authUtils')
const { getOne, insertDataTrans } = require('@utils/dbUtils')
const initData = require('./initData')
const initAdminUser = require('./initAdminUser')

;(async () => {
  // creating the table structure
  const client = await pool.connect()
  const query = (request, values) => client.query(request, values)
  try {
    console.log('Creating tables..')
    const dbUser = process.env.DB_USER
    await query(database.BEGIN)
    await query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO ${dbUser};
    GRANT ALL ON SCHEMA public TO public;   
  `)
    const request = await fs.readFile('./src/database/dbSchema.sql', 'utf8')
    await query(request)
    await query(database.COMMIT)
    console.log('Tables are created')
  } catch (err) {
    await query(database.ROLLBACK)
    console.log('Tables creation failed', err)
    client.release()
    pool.end()
  }
  // creating initial admin user
  try {
    await query(database.BEGIN)
    const { firstName, lastName, password, email } = initAdminUser
    const salt = crypto.randomBytes(16).toString('hex')
    const hashCheck = crypto.randomBytes(16).toString('hex')
    const passwordHash = calculateHash(password, salt)
    const user = { accountId: 0 }
    const { id: accountId } = getOne(
      await insertDataTrans(
        query,
        user,
        'auth_accounts',
        {
          email,
          isEmailVerified: true,
          passwordHash,
          salt,
          hashCheck,
          isCreatedLocally: true,
          lastLoginProvider: loginProviders.LOCAL,
        },
        'id'
      )
    )
    user.accountId = accountId
    const { id: userId } = getOne(
      await insertDataTrans(query, user, 'auth_users', { firstName, lastName, accountId }, 'id')
    )
    await insertDataTrans(query, user, 'user_profile', { userId })
    console.log('User is created, inserting initial data..')
    for (const entry of initData) {
      console.log('Processing table: ', entry.table)
      for (const row of entry.data) {
        await insertDataTrans(query, user, entry.table, row)
      }
    }
    console.log('Initial data inserted, assigning roles to the user..')
    for (const roleId of initAdminUser.roles) {
      await insertDataTrans(query, user, 'user_to_role', { userId, roleId })
    }
    console.log('All done!')
    await query(database.COMMIT)
  } catch (err) {
    await query(database.ROLLBACK)
    console.log('User creation failed', err)
  } finally {
    client.release()
    pool.end()
  }
})()
