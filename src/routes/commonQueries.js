const express = require('express');
const router = express.Router();
const dbManager = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  getAllTemplates,
  getTemplatesByCategory,
  getCategories,
  getTemplateById
} = require('../utils/queryTemplates');

/**
 * @swagger
 * /api/common-queries:
 *   get:
 *     summary: List all common query templates
 *     tags: [Common Queries]
 *     description: Get a list of all predefined query templates
 *     responses:
 *       200:
 *         description: Query templates retrieved successfully
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
 *                       example: 15
 *                     templates:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           category:
 *                             type: string
 *                           sql:
 *                             type: string
 *                           params:
 *                             type: array
 *                           database:
 *                             type: string
 */
router.get('/', asyncHandler(async (req, res) => {
  const templates = getAllTemplates();
  
  res.json({
    success: true,
    data: {
      count: templates.length,
      templates
    }
  });
}));

/**
 * @swagger
 * /api/common-queries/categories:
 *   get:
 *     summary: List all query categories
 *     tags: [Common Queries]
 *     description: Get a list of all query categories with counts
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
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
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: users
 *                           count:
 *                             type: number
 *                             example: 4
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = getCategories();
  
  res.json({
    success: true,
    data: {
      count: categories.length,
      categories
    }
  });
}));

/**
 * @swagger
 * /api/common-queries/category/{categoryName}:
 *   get:
 *     summary: Get queries by category
 *     tags: [Common Queries]
 *     description: Get all query templates in a specific category
 *     parameters:
 *       - in: path
 *         name: categoryName
 *         required: true
 *         schema:
 *           type: string
 *         description: The category name
 *         example: users
 *     responses:
 *       200:
 *         description: Category queries retrieved successfully
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
 *                     category:
 *                       type: string
 *                     count:
 *                       type: number
 *                     templates:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/category/:categoryName', asyncHandler(async (req, res) => {
  const { categoryName } = req.params;
  const templates = getTemplatesByCategory(categoryName);
  
  res.json({
    success: true,
    data: {
      category: categoryName,
      count: templates.length,
      templates
    }
  });
}));

/**
 * @swagger
 * /api/common-queries/{queryId}:
 *   get:
 *     summary: Get query template by ID
 *     tags: [Common Queries]
 *     description: Get details of a specific query template
 *     parameters:
 *       - in: path
 *         name: queryId
 *         required: true
 *         schema:
 *           type: string
 *         description: The query template ID
 *         example: listAllUsers
 *     responses:
 *       200:
 *         description: Query template retrieved successfully
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
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     category:
 *                       type: string
 *                     sql:
 *                       type: string
 *                     params:
 *                       type: array
 *                     database:
 *                       type: string
 *       404:
 *         description: Query template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:queryId', asyncHandler(async (req, res) => {
  const { queryId } = req.params;
  const template = getTemplateById(queryId);
  
  if (!template) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Query template not found',
        queryId
      }
    });
  }
  
  res.json({
    success: true,
    data: template
  });
}));

/**
 * @swagger
 * /api/common-queries/{queryId}/execute:
 *   post:
 *     summary: Execute a common query template
 *     tags: [Common Queries]
 *     description: Execute a predefined query template with optional custom parameters
 *     parameters:
 *       - in: path
 *         name: queryId
 *         required: true
 *         schema:
 *           type: string
 *         description: The query template ID
 *         example: getUserById
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - database
 *             properties:
 *               database:
 *                 type: string
 *                 description: Required database name to execute the query
 *                 example: local
 *               params:
 *                 type: array
 *                 description: Optional custom parameters to override template defaults
 *                 items: {}
 *                 example: ["2025-01-01", "2025-12-31"]
 *           examples:
 *             withParams:
 *               summary: Execute with custom parameters
 *               value:
 *                 database: local
 *                 params: [123]
 *             withDefaults:
 *               summary: Execute with template defaults
 *               value:
 *                 database: local
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
 *                     queryId:
 *                       type: string
 *                     queryName:
 *                       type: string
 *                     database:
 *                       type: string
 *                     sql:
 *                       type: string
 *                     params:
 *                       type: array
 *                     rowCount:
 *                       type: number
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Query template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Query execution failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:queryId/execute', asyncHandler(async (req, res) => {
  const { queryId } = req.params;
  const { params: customParams, database } = req.body || {};
  
  // Validate required database parameter
  if (!database) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Database parameter is required',
        field: 'database'
      }
    });
  }
  
  // Get template
  const template = getTemplateById(queryId);
  
  if (!template) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Query template not found',
        queryId
      }
    });
  }
  
  // Use custom params or defaults from template
  const params = customParams !== undefined ? customParams : template.params;
  const sql = template.sql;
  
  // Get database pool
  const pool = dbManager.getPool(database);
  
  // Execute query
  const [results] = await pool.query(sql, params);
  
  // Post-process results for contract queries to parse JSON fields
  let processedResults = results;
  if (Array.isArray(results) && template.category === 'contracts') {
    processedResults = results.map(row => {
      // Parse total_amount field
      if (row.total_amount && typeof row.total_amount === 'string') {
        try {
          row.total_amount = JSON.parse(row.total_amount);
        } catch (e) {
          // Keep original if parse fails
        }
      }
      // Parse total_amount_rmb field
      if (row.total_amount_rmb && typeof row.total_amount_rmb === 'string') {
        try {
          row.total_amount_rmb = JSON.parse(row.total_amount_rmb);
        } catch (e) {
          // Keep original if parse fails
        }
      }
      return row;
    });
  }
  
  res.json({
    success: true,
    data: {
      queryId: template.id,
      queryName: template.name,
      database,
      sql,
      params,
      rowCount: Array.isArray(processedResults) ? processedResults.length : 0,
      results: Array.isArray(processedResults) ? processedResults : undefined,
      affectedRows: results.affectedRows,
      insertId: results.insertId
    }
  });
}));

module.exports = router;
