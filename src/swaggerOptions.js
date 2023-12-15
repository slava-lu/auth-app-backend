const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Demo App API',
      version: '1.0.0',
      description: '',
    },

    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'jwt',
        },
      },
      schemas: {
        UserDetailed: {
          type: 'object',
          properties: {
            userDetailed: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: "User's email address.",
                },
                isEmailVerified: {
                  type: 'boolean',
                  description: "Indicates if the user's email has been verified.",
                },
                isTwoFaEnabled: {
                  type: 'boolean',
                  description: 'Indicates if two-factor authentication is enabled for the user.',
                },
                lastLoginAt: {
                  type: 'string',
                  format: 'date-time',
                  description: "Timestamp of the user's last login.",
                },
                lastLoginProvider: {
                  type: 'string',
                  description: "The provider used during the user's last login.",
                },
                isBanned: {
                  type: 'boolean',
                  description: 'Indicates if the user has been banned.',
                },
                passwordChangeRequired: {
                  type: 'boolean',
                  description: 'Indicates if the user needs to change their password.',
                },
                firstName: {
                  type: 'string',
                  description: "User's first name.",
                },
                lastName: {
                  type: 'string',
                  description: "User's last name.",
                },
                roles: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'List of roles associated with the user.',
                },
              },
            },
            resultCode: {
              type: 'string',
              enum: ['SUCCESS'],
              description: 'Result code of the operation.',
            },
          },
        },
        UserInfo: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: "User's email address.",
            },
            isEmailVerified: {
              type: 'boolean',
              description: "Indicates if the user's email has been verified.",
            },
            isTwoFaEnabled: {
              type: 'boolean',
              description: 'Indicates if two-factor authentication is enabled for the user.',
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description: "Timestamp of the user's last login.",
            },
            lastLoginProvider: {
              type: 'string',
              description: "The provider used during the user's last login.",
            },
            firstName: {
              type: 'string',
              description: "User's first name.",
            },
            lastName: {
              type: 'string',
              description: "User's last name.",
            },
            roles: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of roles associated with the user.',
            },
          },
        },
        UserInfoWithImpersonation: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: "User's email address.",
            },
            isEmailVerified: {
              type: 'boolean',
              description: "Indicates if the user's email has been verified.",
            },
            isTwoFaEnabled: {
              type: 'boolean',
              description: 'Indicates if two-factor authentication is enabled for the user.',
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description: "Timestamp of the user's last login.",
            },
            lastLoginProvider: {
              type: 'string',
              description: "The provider used during the user's last login.",
            },
            firstName: {
              type: 'string',
              description: "User's first name.",
            },
            lastName: {
              type: 'string',
              description: "User's last name.",
            },
            impersonationMode: {
              type: 'boolean',
              description: 'Indicates if the impersonation mode is active for the user',
            },
            roles: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of roles associated with the user.',
            },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            birthday: {
              type: 'string',
              format: 'date',
            },
            bio: {
              type: 'string',
            },
            linkedInUrl: {
              type: 'string',
              format: 'uri',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            middleName: {
              type: 'string',
            },
            isVerified: {
              type: 'boolean',
            },
            gender: {
              type: 'string',
            },
          },
        },
        ErrorModel: {
          type: 'object',
          properties: {
            resultCode: {
              type: 'string',
              enum: ['ERROR'],
              description: 'Result code of the operation.',
            },
            errorCode: {
              type: 'string',
              description: 'Specific error code indicating the nature of the error.',
            },
            message: {
              type: 'string',
              description: 'Detailed error message.',
            },
          },
        },
      },
      responses: {
        '403Forbidden': {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorModel',
              },
            },
          },
        },
        '401Unauthorized': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorModel',
              },
            },
          },
        },
        '400BadRequest': {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorModel',
              },
            },
          },
        },
        '404NotFound': {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorModel',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/api/v1/**/*.js'],
}

module.exports = swaggerOptions
