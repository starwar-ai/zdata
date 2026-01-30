const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express MySQL Multi-Database API',
      version: '1.0.0',
      description: 'A Node.js Express server that connects to multiple MySQL databases with REST API support for executing custom SQL queries and managing DDL scripts.',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Common Queries',
        description: 'Predefined common query templates for quick execution'
      },
      {
        name: 'Contracts',
        description: 'Contract operations including CNY amount calculation'
      },
      {
        name: 'Databases',
        description: 'Database management operations'
      },
      {
        name: 'DDL',
        description: 'DDL script management and execution'
      },
      {
        name: 'Queries',
        description: 'SQL query execution endpoints'
      }
    ],
    components: {
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Error description'
                },
                details: {
                  type: 'string',
                  example: 'Additional error details'
                }
              }
            }
          }
        },
        Database: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'local'
            },
            host: {
              type: 'string',
              example: 'localhost'
            },
            port: {
              type: 'number',
              example: 3306
            },
            database: {
              type: 'string',
              example: 'foreign_trade'
            }
          }
        },
        DDLScript: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: '01_create_tables.sql'
            },
            size: {
              type: 'number',
              example: 1234
            },
            modified: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-27T10:00:00.000Z'
            }
          }
        },
        QueryRequest: {
          type: 'object',
          required: ['database', 'sql'],
          properties: {
            database: {
              type: 'string',
              example: 'local',
              description: 'The name of the database to execute query on'
            },
            sql: {
              type: 'string',
              example: 'SELECT * FROM users WHERE status = ?',
              description: 'The SQL query to execute'
            },
            params: {
              type: 'array',
              items: {},
              example: ['active'],
              description: 'Optional parameters for parameterized queries'
            }
          }
        },
        BatchQueryRequest: {
          type: 'object',
          required: ['database', 'queries'],
          properties: {
            database: {
              type: 'string',
              example: 'local'
            },
            queries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sql: {
                    type: 'string',
                    example: 'INSERT INTO users (username, email) VALUES (?, ?)'
                  },
                  params: {
                    type: 'array',
                    items: {},
                    example: ['john_doe', 'john@example.com']
                  }
                }
              }
            }
          }
        },
        DDLExecuteRequest: {
          type: 'object',
          required: ['scriptName'],
          properties: {
            scriptName: {
              type: 'string',
              example: '01_create_tables.sql',
              description: 'The name of the DDL script to execute'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/app.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
