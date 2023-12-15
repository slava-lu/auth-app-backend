// This middleware checks if a user has the required role(s) as well as the dependant roles, if any are required.

const { query } = require('@utils/dbUtils')
const { resultCodes } = require('@utils/const')
const { getAll } = require('@utils/dbUtils')

const getUserRoles = (userId) => {
  const sql = ` SELECT ur."roleId", ar."name" FROM user_to_role AS ur 
                 INNER JOIN auth_roles AS ar
                 ON ur."roleId" = ar."id"
                 WHERE ur."userId" = $1 `
  const values = [userId]
  return query(sql, values)
}

// We use the classical function to get access to the arguments' parameter.
// We check that the function has only one argument to eliminate the error, when roles are not put into the array,
// but rather used as a separate argument.

function checkRoles(roles) {
  if (arguments.length > 1) {
    throw new Error('There should be only one argument in checkRole function')
  }
  return async (req, res, next) => {
    const { userId } = req.user
    const config = req.app.get('config')
    const roleDependencies = config?.roleDependencies ? config.roleDependencies : {}
    try {
      const userRoles = getAll(await getUserRoles(userId))
      const requiredRoles = Array.isArray(roles) ? roles : [roles]
      if (!roles || requiredRoles.length === 0) {
        return res.status(403).send({
          resultCode: resultCodes.ERROR,
          message: req.t('auth_error#roles_note_specified'),
        })
      }
      if (userRoles.length === 0) {
        return res.status(403).send({
          resultCode: resultCodes.ERROR,
          message: req.t('auth_error#user_no_roles'),
        })
      }
      if (userRoles.length > 0) {
        const missedRoles = []
        const missedDependencies = []
        for (const requiredRole of requiredRoles) {
          const roleFound = userRoles.find((userRole) => userRole.name === requiredRole)
          if (!roleFound) {
            missedRoles.push(requiredRole)
          }
          const dependencies = roleDependencies[requiredRole]
          if (dependencies) {
            for (const dependency of dependencies) {
              const dependantRoleFound = userRoles.find((userRole) => userRole.name === dependency)
              if (!dependantRoleFound) {
                missedDependencies.push(dependency)
              }
            }
          }
        }
        if (missedRoles.length > 0) {
          return res.status(403).send({
            resultCode: resultCodes.ERROR,
            message: `${req.t('auth_error#roles_missed')} ${missedRoles.join(', ')}`,
            missedRoles,
          })
        }
        if (missedDependencies.length > 0) {
          return res.status(403).send({
            resultCode: resultCodes.ERROR,
            message: `${req.t('auth_error#role_dependancies_missed')}  ${missedDependencies.join(', ')}`,
            missedDependencies,
          })
        }
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = { checkRoles }
