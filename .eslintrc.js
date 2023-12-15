module.exports = {
  extends: ['standard', 'prettier'],
  parserOptions: {
    ecmaVersion: 2020,
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    camelcase: 'off',
  },
}
