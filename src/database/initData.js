const { userRoles } = require('@utils/const')
module.exports = [
  {
    table: 'auth_roles',
    data: [
      { id: userRoles.SUPER_ADMIN_ROLE_ID, name: userRoles.SUPER_ADMIN_ROLE_NAME },
      { id: userRoles.ADMIN_ROLE_ID, name: userRoles.ADMIN_ROLE_NAME },
      { id: userRoles.TWO_FA_ROLE_ID, name: userRoles.TWO_FA_ROLE_NAME },
      { id: userRoles.IMPERSONATION_ROLE_ID, name: userRoles.IMPERSONATION_ROLE_NAME },
    ],
  },
  {
    table: 'general_config',
    data: [
      { param: { oneLoginOnly: false } },
      {
        param: { autoLogout: { isEnabled: false, warningTime: 30, timeout: 180 } },
      },
      { param: { socialLoginNotAllowed: [userRoles.ADMIN_ROLE_NAME, userRoles.IMPERSONATION_ROLE_NAME] } },
      { param: { roleDependencies: { [userRoles.ADMIN_ROLE_NAME]: [[userRoles.TWO_FA_ROLE_NAME]] } } },
    ],
  },
  {
    table: 'user_genders',
    data: [
      {
        id: 1,
        name: 'male',
      },
      {
        id: 2,
        name: 'female',
      },
    ],
  },
]
