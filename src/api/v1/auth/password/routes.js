const express = require('express')
const crypto = require('crypto')
const sgMail = require('@sendgrid/mail')
const { updateData, getOne } = require('@utils/dbUtils')
const { checkIfEmailExists, getPasswordByAccount } = require('../authQueries')
const { getPasswordResetCode } = require('./queries')
const { checkUser } = require('@middlewares')
const { checkPassword, calculateHash, calculateRandomString } = require('../authUtils')
const { resultCodes, errorCodes, times, links, NO_REPLY_FROM } = require('@utils/const')
const { emailTemplates } = require('@utils/email_const')
const { validatePassword } = require('@utils/helpers')

const router = express.Router()
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

/**
 * @swagger
 * /api/v1/auth/password/change:
 *   post:
 *     security:
 *       - cookieAuth: []
 *     summary: Change the password of the authenticated user by providing the old and new passwords
 *     tags:
 *       - Authentication - Password Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: User's current password.
 *               newPassword:
 *                 type: string
 *                 description: New password for the user.
 *     responses:
 *       200:
 *         description: Successful password change
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   enum: [SUCCESS]
 *                   description: The result code of the operation.
 */
router.post('/change', checkUser(), async (req, res, next) => {
  const { accountId, impersonationMode } = req.user
  if (impersonationMode) {
    return res.status(403).send({
      resultCode: resultCodes.ERROR,
      message: req.t('auth_error#not_allowed_in_impersonation'),
    })
  }
  const passwordChangedAt = new Date()
  try {
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
      return res.status(403).send({
        resultCode: resultCodes.ERROR,
        message: req.t('auth_error#password_change_failed'),
      })
    }
    if (oldPassword === newPassword) {
      return res.status(403).send({
        resultCode: resultCodes.ERROR,
        message: req.t('auth_error#password_should_be_different'),
      })
    }
    const validationResult = validatePassword(newPassword)
    if (validationResult) {
      return res.status(400).send({
        resultCode: resultCodes.ERROR,
        message: req.t(validationResult),
      })
    }

    if (accountId) {
      const { passwordHash, salt } = getOne(await getPasswordByAccount(accountId))
      const isPasswordCorrect = checkPassword(oldPassword, passwordHash, salt)
      if (isPasswordCorrect) {
        const newSalt = crypto.randomBytes(16).toString('hex')
        const newPasswordHash = calculateHash(newPassword, newSalt)

        await updateData(
          req.user,
          'auth_accounts',
          { passwordHash: newPasswordHash, passwordChangeRequired: false, salt: newSalt, passwordChangedAt },
          'id',
          accountId,
        )

        res.send({
          resultCode: resultCodes.SUCCESS,
        })
      } else {
        return res.status(403).send({
          resultCode: resultCodes.ERROR,
          errorCode: errorCodes.OLD_PASSWORD_IS_NOT_CORRECT,
          message: req.t('auth_error#old_password_not_correct'),
        })
      }
    } else {
      return res.status(403).send({
        resultCode: resultCodes.ERROR,
        message: req.t('auth_error#user_not_found'),
      })
    }
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/password/checkResetCode:
 *   get:
 *     summary: Verify the validity of the password reset code from the reset link before changing the password
 *     tags:
 *       - Authentication - Password Management
 *     parameters:
 *       - in: query
 *         name: passwordResetCode
 *         required: true
 *         description: The password reset code sent to the user's email.
 *         schema:
 *           type: string
 *       - in: query
 *         name: email
 *         required: true
 *         description: User's email to match the password reset code.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Valid password reset code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   enum: [SUCCESS]
 *                   description: The result code of the operation.
 */
router.get('/checkResetCode', async (req, res, next) => {
  try {
    const { passwordResetCode, email } = req?.query
    if (!passwordResetCode || !email) {
      return res.status(403).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.PASSWORD_RESET_LINK_INVALID,
        message: req.t('auth_error#password_reset_link_invalid'),
      })
    }
    const { passwordResetCode: passwordResetCodeFromDb, passwordResetAt } = getOne(await getPasswordResetCode(email))
    const isTimeNotExpired =
      passwordResetAt && passwordResetAt.getTime() + times.PASSWORD_RESET_LINK_VALID_TIME > Date.now()
    if (passwordResetCodeFromDb === passwordResetCode && !isTimeNotExpired) {
      return res.status(403).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.PASSWORD_RESET_LINK_EXPIRED,
        message: req.t('auth_error#password_reset_link_expired'),
      })
    }
    if (passwordResetCodeFromDb === passwordResetCode && isTimeNotExpired) {
      return res.send({
        resultCode: resultCodes.SUCCESS,
      })
    } else {
      return res.status(403).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.PASSWORD_RESET_LINK_INVALID,
        message: req.t('auth_error#password_reset_link_invalid'),
      })
    }
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/password/resetByCode:
 *   post:
 *     summary: Reset password using the code from the password reset link
 *     tags:
 *       - Authentication - Password Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passwordResetCode
 *               - email
 *               - password
 *             properties:
 *               passwordResetCode:
 *                 type: string
 *                 description: The password reset code sent to the user's email.
 *               email:
 *                 type: string
 *                 description: User's email to match the password reset code.
 *               password:
 *                 type: string
 *                 description: The new password the user wants to set.
 *     responses:
 *       200:
 *         description: Password reset was successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   enum: [SUCCESS]
 *                   description: The result code of the operation.
 */
router.post('/resetByCode', async (req, res, next) => {
  const passwordChangedAt = new Date()
  try {
    const { passwordResetCode, email, password } = req.body
    if (!passwordResetCode || !email || !password) {
      return res.status(403).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.PASSWORD_RESET_LINK_INVALID,
        message: req.t('auth_error#password_reset_link_invalid'),
      })
    }
    const validationResult = validatePassword(password)
    if (validationResult) {
      return res.status(400).send({
        resultCode: resultCodes.ERROR,
        message: req.t(validationResult),
      })
    }
    const {
      id,
      passwordResetCode: passwordResetCodeFromDb,
      passwordResetAt,
    } = getOne(await getPasswordResetCode(email))
    const isTimeNotExpired =
      passwordResetAt && passwordResetAt.getTime() + times.PASSWORD_RESET_LINK_VALID_TIME > Date.now()
    if (passwordResetCodeFromDb === passwordResetCode && !isTimeNotExpired) {
      return res.status(403).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.PASSWORD_RESET_LINK_EXPIRED,
        message: req.t('auth_error#password_reset_link_expired'),
      })
    }
    if (passwordResetCodeFromDb === passwordResetCode && isTimeNotExpired) {
      const salt = crypto.randomBytes(16).toString('hex')
      const passwordHash = calculateHash(password, salt)

      const user = { accountId: id }
      await updateData(
        user,
        'auth_accounts',
        { passwordHash, passwordChangedAt, salt, passwordResetCode: null, passwordResetAt: null },
        'email',
        email,
      )

      return res.send({
        resultCode: resultCodes.SUCCESS,
      })
    } else {
      return res.status(403).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.PASSWORD_RESET_LINK_INVALID,
        message: req.t('auth_error#password_reset_link_invalid'),
      })
    }
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/password/requestResetCode:
 *   get:
 *     summary: Send the password reset link to the user via email
 *     tags:
 *       - Authentication - Password Management
 *     parameters:
 *       - name: email
 *         in: query
 *         required: true
 *         description: Email of the user requesting a password reset.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The request has been processed, and if the email exists, a password reset link has been sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   enum: [SUCCESS]
 *                   description: The result code of the operation.
 */
router.get('/requestResetCode', async (req, res, next) => {
  const passwordResetAt = new Date()
  try {
    const { email } = req?.query
    if (!email) {
      return res.status(400).send({
        resultCode: resultCodes.ERROR,
        message: req.t('auth_error#no_email_supplied'),
      })
    }
    const { id } = getOne(await checkIfEmailExists(email))
    // we send the same response as if the link was sent to reduce DOS attacks
    if (!id) {
      return res.send({
        resultCode: resultCodes.SUCCESS,
      })
    }
    const user = { accountId: id }
    const passwordResetCode = calculateRandomString()
    await updateData(user, 'auth_accounts', { passwordResetCode, passwordResetAt }, 'email', email)

    const url = links.PASSWORD_RESET_LINK
    const lang = req.locale
    const msg = {
      to: email,
      from: NO_REPLY_FROM,
      templateId: emailTemplates[lang].PASSWORD_RESET,
      dynamicTemplateData: {
        url,
        passwordResetCode,
        email: encodeURIComponent(email),
      },
    }
    sgMail.send(msg)

    return res.send({
      resultCode: resultCodes.SUCCESS,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
