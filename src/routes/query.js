const express = require('express');
const router = express.Router();
const dbManager = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @swagger
 * /api/query/execute:
 *   post:
 *     summary: Execute a custom SQL query
 *     tags: [Queries]
 *     description: Execute a custom SQL query on a specified database with optional parameterized values
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QueryRequest'
 *           examples:
 *             selectQuery:
 *               summary: SELECT query
 *               value:
 *                 database: local
 *                 sql: SELECT * FROM users WHERE status = ?
 *                 params: ["active"]
 *             insertQuery:
 *               summary: INSERT query
 *               value:
 *                 database: local
 *                 sql: INSERT INTO users (username, email, password) VALUES (?, ?, ?)
 *                 params: ["john_doe", "john@example.com", "hashed_pass"]
 *     responses:
 *       200:
 *         description: Query executed successfully
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
 *                     queryType:
 *                       type: string
 *                       example: SELECT
 *                     rowCount:
 *                       type: number
 *                       example: 2
 *                     affectedRows:
 *                       type: number
 *                     insertId:
 *                       type: number
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/execute', asyncHandler(async (req, res) => {
  const { database, sql, params = [] } = req.body;

  // Validation
  if (!database) {
    return res.status(400).json({
      success: false,
      error: { message: 'Database name is required' }
    });
  }

  if (!sql) {
    return res.status(400).json({
      success: false,
      error: { message: 'SQL query is required' }
    });
  }

  // Get database pool
  const pool = dbManager.getPool(database);

  // Execute query
  const [results] = await pool.query(sql, params);

  // Determine query type
  const queryType = sql.trim().split(' ')[0].toUpperCase();
  const isSelect = queryType === 'SELECT' || queryType === 'SHOW' || queryType === 'DESCRIBE';

  res.json({
    success: true,
    data: {
      database,
      queryType,
      rowCount: Array.isArray(results) ? results.length : 0,
      affectedRows: results.affectedRows,
      insertId: results.insertId,
      results: isSelect ? results : undefined
    }
  });
}));

/**
 * @swagger
 * /api/query/batch:
 *   post:
 *     summary: Execute multiple queries in a transaction
 *     tags: [Queries]
 *     description: Execute multiple SQL queries in a transaction. All queries will be rolled back if any query fails.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchQueryRequest'
 *             example:
 *             database: local
 *             queries:
 *               - sql: INSERT INTO users (username, email, password) VALUES (?, ?, ?)
 *                 params: ["new_user", "new@example.com", "hashed_pass"]
 *               - sql: UPDATE products SET stock = stock - 1 WHERE id = ?
 *                 params: [1]
 *     responses:
 *       200:
 *         description: Batch queries executed successfully
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
 *                     totalQueries:
 *                       type: number
 *                       example: 2
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           index:
 *                             type: number
 *                           affectedRows:
 *                             type: number
 *                           insertId:
 *                             type: number
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error (transaction rolled back)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/batch', asyncHandler(async (req, res) => {
  const { database, queries } = req.body;

  // Validation
  if (!database) {
    return res.status(400).json({
      success: false,
      error: { message: 'Database name is required' }
    });
  }

  if (!queries || !Array.isArray(queries) || queries.length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'Queries array is required and must not be empty' }
    });
  }

  // Get database pool and connection
  const pool = dbManager.getPool(database);
  const connection = await pool.getConnection();

  try {
    // Start transaction
    await connection.beginTransaction();

    const results = [];

    // Execute each query
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      if (!query.sql) {
        throw new Error(`Query at index ${i} is missing SQL statement`);
      }

      const [result] = await connection.query(query.sql, query.params || []);
      
      results.push({
        index: i,
        affectedRows: result.affectedRows,
        insertId: result.insertId
      });
    }

    // Commit transaction
    await connection.commit();

    res.json({
      success: true,
      data: {
        database,
        totalQueries: queries.length,
        results
      }
    });
  } catch (error) {
    // Rollback on error
    await connection.rollback();
    throw error;
  } finally {
    // Release connection
    connection.release();
  }
}));

/**
 * @swagger
 * /api/query/prepared:
 *   post:
 *     summary: Execute a prepared statement
 *     tags: [Queries]
 *     description: Execute a prepared statement with parameters (recommended for user input to prevent SQL injection)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QueryRequest'
 *             example:
 *             database: local
 *             sql: SELECT * FROM users WHERE email = ? AND status = ?
 *             params: ["john@example.com", "active"]
 *     responses:
 *       200:
 *         description: Prepared statement executed successfully
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
 *                     queryType:
 *                       type: string
 *                     rowCount:
 *                       type: number
 *                     affectedRows:
 *                       type: number
 *                     insertId:
 *                       type: number
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/prepared', asyncHandler(async (req, res) => {
  const { database, sql, params = [] } = req.body;

  // Validation
  if (!database) {
    return res.status(400).json({
      success: false,
      error: { message: 'Database name is required' }
    });
  }

  if (!sql) {
    return res.status(400).json({
      success: false,
      error: { message: 'SQL query is required' }
    });
  }

  // Get database pool
  const pool = dbManager.getPool(database);

  // Execute prepared statement
  const [results] = await pool.execute(sql, params);

  // Determine query type
  const queryType = sql.trim().split(' ')[0].toUpperCase();
  const isSelect = queryType === 'SELECT' || queryType === 'SHOW' || queryType === 'DESCRIBE';

  res.json({
    success: true,
    data: {
      database,
      queryType,
      rowCount: Array.isArray(results) ? results.length : 0,
      affectedRows: results.affectedRows,
      insertId: results.insertId,
      results: isSelect ? results : undefined
    }
  });
}));

module.exports = router;
