const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const HASH_ITERATIONS = process.env.HASH_ITERATIONS
const HASH_KEY_LENGTH = process.env.HASH_KEY_LENGTH
const HASH_DIGEST = process.env.HASH_DIGEST
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN

const calculateHash = (password, salt) => {
  return crypto
    .pbkdf2Sync(password, salt, parseInt(HASH_ITERATIONS), parseInt(HASH_KEY_LENGTH), HASH_DIGEST)
    .toString('hex')
}

const createToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

const verifyToken = (token) => {
  if (!token) return null
  return jwt.verify(token, JWT_SECRET)
}

const calculateRandomString = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

const checkPassword = (password, passwordHash, salt) => {
  if (!password) return false
  if (!passwordHash) return false
  return calculateHash(password, salt) === passwordHash
}

module.exports = { checkPassword, calculateHash, createToken, verifyToken, calculateRandomString }
