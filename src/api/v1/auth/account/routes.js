const express = require('express')
const crypto = require('crypto')
const sgMail = require('@sendgrid/mail')
const { updateData, getOne } = require('@utils/dbUtils')
const { createToken, calculateHash, calculateRandomString } = require('../authUtils')
const { resultCodes, errorCodes, links, cookiesOption, NO_REPLY_FROM } = require('@utils/const')
const { emailTemplates } = require('@utils/email_const')
const { checkUser } = require('@middlewares')
const { checkIfEmailExists, checkIfMobileExists, getUserInfoByAccountId } = require('../authQueries')
const { createAccountTransaction, getAccountRestoreCode, getEmailVerificationCode } = require('./queries')
const { validatePassword } = require('@utils/helpers')

const router = express.Router()

sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const COOKIES_EXPIRES_IN = process.env.COOKIES_EXPIRES_IN

const cookiesOptionRemember = () => ({
  ...cookiesOption,
  expires: new Date(Date.now() + parseInt(COOKIES_EXPIRES_IN) * 24 * 60 * 60 * 1000),
})

/**
 * @swagger
 * /api/v1/auth/accounts:
 *   post:
 *     summary: Create a local user account
 *     tags:
 *       - Authentication - Account Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address.
 *               mobilePhone:
 *                 type: string
 *                 description: User's mobile phone number.
 *               password:
 *                 type: string
 *                 description: User's password.
 *               firstName:
 *                 type: string
 *                 description: User's first name.
 *               lastName:
 *                 type: string
 *                 description: User's last name.
 *               isRemember:
 *                 type: boolean
 *                 description: Indicates if the user should be remembered on the client.
 *     responses:
 *       200:
 *         description: Successful operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultCode:
 *                   type: string
 *                   enum: [SUCCESS]
 *                   description: The result code of the operation.
 *                 userInfo:
 *                  $ref: '#/components/schemas/UserInfo'
 */
router.post('/', async (req, res, next) => {
  try {
    const { email = '', mobilePhone, password, firstName = '', lastName = '', isRemember } = req.body

    const validationResult = validatePassword(password)
    if (validationResult) {
      return res.status(400).send({
        resultCode: resultCodes.ERROR,
        message: req.t(validationResult),
      })
    }

    const { id: idIfEmail } = getOne(await checkIfEmailExists(email))
    if (idIfEmail) {
      return res.status(400).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.EMAIL_EXISTS,
        message: req.t('auth_error#email_in_use'),
      })
    }
    const { id: idIfMobile } = getOne(await checkIfMobileExists(mobilePhone))
    if (idIfMobile) {
      return res.status(400).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.MOBILE_EXISTS,
        message: req.t('auth_error#mobile_in_use'),
      })
    }

    const salt = crypto.randomBytes(16).toString('hex')
    const hashCheck = crypto.randomBytes(16).toString('hex')
    const passwordHash = calculateHash(password, salt)
    const emailVerificationCode = calculateRandomString()
    const isCreatedLocally = true
    const result = await createAccountTransaction({
      email,
      emailVerificationCode,
      mobilePhone,
      passwordHash,
      salt,
      hashCheck,
      firstName,
      lastName,
      isCreatedLocally,
    })
    const { accountId, userId } = result
    if (!accountId || !userId) {
      return res.status(400).send({
        resultCode: resultCodes.ERROR,
        message: req.t('auth_error#could_not_create_user'),
      })
    }
    const userInfo = getOne(await getUserInfoByAccountId(accountId))
    const jwt = createToken({ accountId, userId, hashCheck, isRemember })

    const url = links.EMAIL_VERIFICATION_LINK
    const lang = req.locale
    const msg = {
      to: email,
      from: NO_REPLY_FROM,
      templateId: emailTemplates[lang].EMAIL_VERIFICATION,
      dynamicTemplateData: {
        url,
        emailVerificationCode,
        accountId,
        firstName,
      },
    }
    sgMail.send(msg)

    const options = isRemember ? cookiesOptionRemember() : cookiesOption

    return res.cookie('jwt', jwt, { ...options }).send({
      resultCode: resultCodes.SUCCESS,
      userInfo,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/accounts/delete:
 *   delete:
 *     security:
 *       - cookieAuth: []
 *     summary: Disable the current user account and send a link to restore the account
 *     tags:
 *       - Authentication - Account Management
 *     description: Deletes a user account and sends an email with the account restoration link.
 *     responses:
 *       200:
 *         description: Successful operation
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
router.delete('/delete', checkUser(), async (req, res, next) => {
  const { accountId, impersonationMode } = req.user

  if (impersonationMode) {
    return res.status(401).send({
      resultCode: resultCodes.ERROR,
      message: req.t('auth_error#not_allowed_in_impersonation'),
    })
  }

  try {
    const deletedAt = new Date()
    const { email } = getOne(await getUserInfoByAccountId(accountId))
    const accountRestoreCode = calculateRandomString()
    await updateData(req.user, 'auth_accounts', { accountRestoreCode, deletedAt, isDeleted: true }, 'id', accountId)
    const url = links.ACCOUNT_RESTORE_LINK
    const lang = req.locale
    const msg = {
      to: email,
      from: NO_REPLY_FROM,
      templateId: emailTemplates[lang].ACCOUNT_RESTORE,
      dynamicTemplateData: {
        url,
        accountRestoreCode,
        accountId,
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

/**
 * @swagger
 * /api/v1/auth/accounts/restore:
 *   get:
 *     summary: Restore the account previously deleted using the provided account restoration link
 *     tags:
 *       - Authentication - Account Management
 *     parameters:
 *       - in: query
 *         name: accountRestoreCode
 *         schema:
 *           type: string
 *         required: true
 *         description: Code for account restoration.
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the account to be restored.
 *     responses:
 *       200:
 *         description: Successful operation
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
router.get('/restore', async (req, res, next) => {
  const restoredAt = new Date()
  try {
    const { accountRestoreCode, accountId } = req?.query
    if (!accountRestoreCode || !accountId) {
      return res.status(401).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.ACCOUNT_RESTORE_LINK_INVALID,
        message: req.t('auth_error#account_restore_link_invalid'),
      })
    }
    const { accountRestoreCode: accountRestoreCodeFromDb } = getOne(await getAccountRestoreCode(accountId))
    if (accountRestoreCode === accountRestoreCodeFromDb) {
      const user = { accountId }
      await updateData(
        user,
        'auth_accounts',
        { isDeleted: false, accountRestoreCode: null, restoredAt },
        'id',
        accountId,
      )
      return res.send({
        resultCode: resultCodes.SUCCESS,
      })
    } else {
      return res.status(401).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.ACCOUNT_RESTORE_LINK_INVALID,
        message: req.t('auth_error#account_restore_link_invalid'),
      })
    }
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/v1/auth/accounts/verifyEmail:
 *   get:
 *     tags:
 *       - Authentication - Account Management
 *     summary: Verify the user's email using the provided email verification link
 *     parameters:
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         required: true
 *         description: Account ID of the user to verify.
 *       - in: query
 *         name: emailVerificationCode
 *         schema:
 *           type: string
 *         required: true
 *         description: Verification code to match.
 *     responses:
 *       200:
 *         description: Successful email verification.
 *         content:
 *           application/json:
 *             schema:
 *               type: 'object'
 *               properties:
 *                 resultCode:
 *                   type: 'string'
 *                   enum: ['SUCCESS']
 *                   description: 'Result code of the operation.'
 *                 userInfo:
 *                   $ref: '#/components/schemas/UserInfo'
 */
router.get('/verifyEmail', async (req, res, next) => {
  const { accountId, emailVerificationCode } = req?.query
  const user = { accountId }
  try {
    if (!emailVerificationCode) {
      return res.status(401).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.VERIFICATION_CODE_NOT_FOUND,
        message: req.t('auth_error#verification_code_not_found'),
      })
    }
    const { emailVerificationCode: emailVerificationCodeFromDb, email } = getOne(
      await getEmailVerificationCode(accountId),
    )
    if (emailVerificationCodeFromDb === emailVerificationCode) {
      await updateData(user, 'auth_accounts', { isEmailVerified: true }, 'id', accountId)

      return res.send({
        resultCode: resultCodes.SUCCESS,
        email,
      })
    } else {
      return res.status(401).send({
        resultCode: resultCodes.ERROR,
        errorCode: errorCodes.VERIFICATION_CODE_IS_NOT_CORRECT,
        message: req.t('auth_error#verification_code_not_correct'),
      })
    }
  } catch (err) {
    next(err)
  }
})

module.exports = router
