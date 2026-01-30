const express = require('express');
const router = express.Router();
const dbManager = require('../config/database');
const ddlLoader = require('../utils/ddlLoader');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @swagger
 * /api/databases:
 *   get:
 *     summary: List all configured databases
 *     tags: [Databases]
 *     description: Get a list of all databases configured in the system
 *     responses:
 *       200:
 *         description: List of databases retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                       example: 2
 *                     databases:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Database'
 */
router.get('/', asyncHandler(async (req, res) => {
  const databases = dbManager.getAllDatabases();
  
  res.json({
    success: true,
    data: {
      count: databases.length,
      databases
    }
  });
}));

/**
 * @swagger
 * /api/databases/{name}/test:
 *   get:
 *     summary: Test database connection
 *     tags: [Databases]
 *     description: Test the connection to a specific database
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The database name
 *         example: local
 *     responses:
 *       200:
 *         description: Connection test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: local
 *                     message:
 *                       type: string
 *                       example: Connection successful
 *       404:
 *         description: Database not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:name/test', asyncHandler(async (req, res) => {
  const { name } = req.params;
  
  const result = await dbManager.testConnection(name);
  
  res.json({
    success: result.success,
    data: {
      database: name,
      ...result
    }
  });
}));

/**
 * @swagger
 * /api/databases/ddl:
 *   get:
 *     summary: List all DDL scripts (unified)
 *     tags: [DDL]
 *     description: Get a list of all DDL scripts - DDL is unified and shared across all databases
 *     responses:
 *       200:
 *         description: DDL scripts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                       example: 1
 *                     scripts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DDLScript'
 */
router.get('/ddl', asyncHandler(async (req, res) => {
  // Use global DDL path
  const scripts = await ddlLoader.listDDLScripts();
  
  res.json({
    success: true,
    data: {
      count: scripts.length,
      scripts,
      note: 'DDL is unified and shared across all databases'
    }
  });
}));

/**
 * @swagger
 * /api/ddl:
 *   get:
 *     summary: List all DDL scripts
 *     tags: [DDL]
 *     description: Get a list of all DDL scripts (unified across all databases)
 *     responses:
 *       200:
 *         description: DDL scripts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                       example: 1
 *                     scripts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DDLScript'
 */
router.get('/:name/ddl', asyncHandler(async (req, res) => {
  const { name } = req.params;
  
  // Verify database exists
  dbManager.getPool(name);
  
  const scripts = await ddlLoader.listDDLScripts();
  
  res.json({
    success: true,
    data: {
      database: name,
      count: scripts.length,
      scripts,
      note: 'DDL is unified across all databases'
    }
  });
}));

/**
 * @swagger
 * /api/databases/ddl/{scriptName}:
 *   get:
 *     summary: Get DDL script content
 *     tags: [DDL]
 *     description: Retrieve the content of a specific DDL script (unified across all databases)
 *     parameters:
 *       - in: path
 *         name: scriptName
 *         required: true
 *         schema:
 *           type: string
 *         description: The DDL script file name
 *         example: ddl.sql
 *     responses:
 *       200:
 *         description: DDL script content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     scriptName:
 *                       type: string
 *                     content:
 *                       type: string
 *       404:
 *         description: Script not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/ddl/:scriptName', asyncHandler(async (req, res) => {
  const { scriptName } = req.params;
  
  const content = await ddlLoader.readDDLScript(scriptName);
  
  res.json({
    success: true,
    data: {
      scriptName,
      content,
      note: 'DDL is unified across all databases'
    }
  });
}));

/**
 * @swagger
 * /api/databases/ddl/execute:
 *   post:
 *     summary: Execute a DDL script on a database
 *     tags: [DDL]
 *     description: Execute a unified DDL script on a specified database
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scriptName
 *               - database
 *             properties:
 *               scriptName:
 *                 type: string
 *                 example: ddl.sql
 *                 description: The DDL script file name
 *               database:
 *                 type: string
 *                 example: local
 *                 description: The target database name
 *     responses:
 *       200:
 *         description: DDL script executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                     scriptName:
 *                       type: string
 *                     totalStatements:
 *                       type: number
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           success:
 *                             type: boolean
 *                           statement:
 *                             type: string
 *                           affectedRows:
 *                             type: number
 *                           error:
 *                             type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Database or script not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/ddl/execute', asyncHandler(async (req, res) => {
  const { scriptName, database } = req.body;
  
  if (!scriptName) {
    return res.status(400).json({
      success: false,
      error: { message: 'Script name is required' }
    });
  }
  
  if (!database) {
    return res.status(400).json({
      success: false,
      error: { message: 'Database name is required' }
    });
  }
  
  // Verify database exists
  dbManager.getPool(database);
  
  const result = await ddlLoader.executeDDLScript(database, scriptName);
  
  res.json({
    success: true,
    data: {
      database,
      ...result,
      note: 'DDL is unified across all databases'
    }
  });
}));

/**
 * @swagger
 * /api/databases/{name}/tables:
 *   get:
 *     summary: List all tables in a database
 *     tags: [Databases]
 *     description: Get a list of all tables in a specific database
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The database name
 *         example: local
 *     responses:
 *       200:
 *         description: Tables retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                     count:
 *                       type: number
 *                     tables:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Database not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:name/tables', asyncHandler(async (req, res) => {
  const { name } = req.params;
  
  const pool = dbManager.getPool(name);
  const [tables] = await pool.query('SHOW TABLES');
  
  res.json({
    success: true,
    data: {
      database: name,
      count: tables.length,
      tables
    }
  });
}));

/**
 * @swagger
 * /api/databases/{name}/tables/{tableName}/schema:
 *   get:
 *     summary: Get table schema
 *     tags: [Databases]
 *     description: Get schema information for a specific table
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The database name
 *         example: local
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *         description: The table name
 *         example: users
 *     responses:
 *       200:
 *         description: Table schema retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                     table:
 *                       type: string
 *                     columns:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           Field:
 *                             type: string
 *                           Type:
 *                             type: string
 *                           Null:
 *                             type: string
 *                           Key:
 *                             type: string
 *                           Default:
 *                             type: string
 *                           Extra:
 *                             type: string
 *       404:
 *         description: Database or table not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:name/tables/:tableName/schema', asyncHandler(async (req, res) => {
  const { name, tableName } = req.params;
  
  const pool = dbManager.getPool(name);
  const [columns] = await pool.query('DESCRIBE ??', [tableName]);
  
  res.json({
    success: true,
    data: {
      database: name,
      table: tableName,
      columns
    }
  });
}));

module.exports = router;
