const { Pool } = require('pg')
const omit = require('lodash/omit')

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

const query = (request, values) => pool.query(request, values)

// fields - array of fields to omit
const getAll = ({ rows }, fields) => {
  let cleanResult = []
  if (rows.length > 0) {
    cleanResult = rows.map((row) => {
      const { createdBy, createdAt, modifiedBy, modifiedAt, ...rest } = row
      if (fields && Array.isArray(fields)) {
        return omit(rest, fields)
      }
      return rest
    })
  }
  return cleanResult
}

// fields - array of fields to omit
const getOne = ({ rows }, fields = false) => {
  let cleanResult = {}
  if (rows.length > 0) {
    cleanResult = rows[0]
    const { createdBy, createdAt, modifiedBy, modifiedAt, ...rest } = cleanResult
    if (fields && Array.isArray(fields)) {
      return omit(rest, fields)
    }
    return rest
  }
  return cleanResult
}

const insertData = (user, tableName, _fields, returnedKey) => {
  const { accountId } = user
  if (!accountId) throw new Error('accountId not found')
  const ct = new Date()
  const fields = { ..._fields, createdBy: accountId, createdAt: ct }
  const fieldsKeys = Object.keys(fields).map((item) => `"${item}"`)
  const fieldValues = Object.values(fields)
  const fieldsParams = fieldValues.map((item, index) => `$${index + 1}`)
  let sql = `INSERT INTO ${tableName} (${fieldsKeys.join(', ')}) 
               VALUES (${fieldsParams.join(', ')})`
  if (returnedKey) {
    sql = `${sql} RETURNING "${returnedKey}"`
  }
  return query(sql, fieldValues)
}

const insertDataTrans = (queryTr, user, tableName, _fields, returnedKey) => {
  const { accountId } = user
  if (accountId === undefined) throw new Error('accountId not found')
  const ct = new Date()
  const fields = { ..._fields, createdBy: accountId, createdAt: ct }
  const fieldsKeys = Object.keys(fields).map((item) => `"${item}"`)
  const fieldValues = Object.values(fields)
  const fieldsParams = fieldValues.map((item, index) => `$${index + 1}`)
  let sql = `INSERT INTO ${tableName} (${fieldsKeys.join(', ')}) 
               VALUES (${fieldsParams.join(', ')})`
  if (returnedKey) {
    sql = `${sql} RETURNING "${returnedKey}"`
  }
  return queryTr(sql, fieldValues)
}

const updateData = (user, tableName, _fields, whereKey, whereValue) => {
  const { accountId, userId } = user
  if (!accountId) throw new Error('accountId not found')
  const ct = new Date()
  if (!whereKey) {
    whereKey = 'userId'
    whereValue = userId
  }
  const fields = { ..._fields, modifiedBy: accountId, modifiedAt: ct }
  Object.keys(fields).forEach((key) => {
    if (fields[key] === undefined) {
      delete fields[key]
    }
  })
  const fieldsKeys = Object.keys(fields).map((item) => `"${item}"`)
  const fieldValues = Object.values(fields)

  const setPart = fieldsKeys.map((key, index) => `${key}=$${index + 1}`)
  const whereParam = `$${fieldsKeys.length + 1}`

  const sql = `UPDATE ${tableName} SET ${setPart.join(', ')} WHERE "${whereKey}" = ${whereParam}`

  return query(sql, [...fieldValues, whereValue])
}

const updateDataTrans = (queryTr, user, tableName, _fields, whereKey, whereValue) => {
  const { accountId, userId } = user
  if (!accountId) throw new Error('accountId not found')
  const ct = new Date()
  if (!whereKey) {
    whereKey = 'userId'
    whereValue = userId
  }
  const fields = { ..._fields, modifiedBy: accountId, modifiedAt: ct }
  Object.keys(fields).forEach((key) => {
    if (fields[key] === undefined) {
      delete fields[key]
    }
  })
  const fieldsKeys = Object.keys(fields).map((item) => `"${item}"`)
  const fieldValues = Object.values(fields)

  const setPart = fieldsKeys.map((key, index) => `${key}=$${index + 1}`)
  const whereParam = `$${fieldsKeys.length + 1}`

  const sql = `UPDATE ${tableName} SET ${setPart.join(', ')} WHERE "${whereKey}" = ${whereParam}`

  return queryTr(sql, [...fieldValues, whereValue])
}

module.exports = { pool, query, getAll, getOne, insertData, updateData, insertDataTrans, updateDataTrans }
