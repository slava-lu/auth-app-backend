const { query } = require('@utils/dbUtils')

// to send all config as JSON and put it into Redux store for  Frontend use
const getConfigOptions = () => {
  const sql = 'SELECT param FROM general_config'
  const values = []
  return query(sql, values)
}

// This will get a specific config parameter stored as a JSON
// We do not need it as we can get a specific param from the app.get('config)
// but I leave it here as a reference to the SQL as it is not trivial
const getConfigParamValue = (paramKey) => {
  const sql = `SELECT param->$1 as "${paramKey}" FROM general_config WHERE param ? $1`
  const values = [paramKey]
  return query(sql, values)
}

const getRoles = () => {
  const sql = `SELECT id, name FROM auth_roles`
  return query(sql)
}

module.exports = { getConfigOptions, getConfigParamValue, getRoles }
