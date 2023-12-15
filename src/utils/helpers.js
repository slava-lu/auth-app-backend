const validatePassword = (password) => {
  if (!password) {
    return 'auth_error#validation_required_field'
  }
  if (password.length < 8) {
    return 'auth_error#validation_password_length'
  }
  if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
    return 'auth_error#validation_password_length'
  }
  return false
}

module.exports = { validatePassword }
