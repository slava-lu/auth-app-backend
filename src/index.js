require('module-alias/register')
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const routes = require('./api')
const { getConfigOptions } = require('./api/v1/system/queries')
const { getAll } = require('@utils/dbUtils')
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const i18n = require('i18n')
const path = require('path')
const swaggerOptions = require('./swaggerOptions')
const { CORS_ORIGIN } = require('@utils/const')

require('axios-debug-log/enable')

const app = express()

const init = async () => {
  try {
    i18n.configure({
      locales: ['en', 'de'],
      directory: path.join(__dirname, 'locales'),
      defaultLocale: 'en',
      api: {
        __: 't',
        __n: 'tN',
      },
    })

    const swaggerDocs = swaggerJsDoc(swaggerOptions)

    const configOption = getAll(await getConfigOptions())
    const config = configOption.map((param) => param.param).reduce((result, obj) => ({ ...result, ...obj }), {})
    // putting config into the global variable that can be accessed like: req.app.get('config');
    app.set('config', config)
    app.use(cookieParser())
    app.use(
      cors({
        credentials: true,
        origin: CORS_ORIGIN,
      })
    )

    app.use(i18n.init)
    app.use((req, res, next) => {
      const lang = req.cookies.locale || 'en'
      req.setLocale(lang)
      next()
    })
    app.use(bodyParser.json())
    app.use('/api', routes)
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

    // Error handling
    app.use((req, res, next) => {
      const error = new Error('Not found')
      error.status = 404
      next(error)
    })

    app.use((error, req, res, next) => {
      console.error(error.stack)
      res.status(error.status || 500).send({
        error: {
          status: error.status || 500,
          message: error.message || 'Internal Server Error',
        },
      })
    })
    app.listen(3000, () => console.log('express is running'))
  } catch (e) {
    console.error('Failed to start express server', e)
  }
}

init()
