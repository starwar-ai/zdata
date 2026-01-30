const express = require('express');
const router = express.Router();
const dbManager = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @swagger
 * /api/products/sync-advantage-flag:
 *   post:
 *     summary: Sync advantage flag from base products to derived products
 *     tags: [Products]
 *     description: Updates advantage_flag for customer products (cust_pro_flag=1) and self-operated products (own_brand_flag=1) based on their base product's advantage_flag
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
 *                 example: local
 *                 description: The target database name
 *     responses:
 *       200:
 *         description: Sync completed successfully
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
 *                     customerProductsUpdated:
 *                       type: number
 *                       example: 15
 *                     selfOperatedProductsUpdated:
 *                       type: number
 *                       example: 8
 *                     totalUpdated:
 *                       type: number
 *                       example: 23
 *                     message:
 *                       type: string
 *                       example: Advantage flag synchronized successfully
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Database not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/sync-advantage-flag', asyncHandler(async (req, res) => {
  const { database } = req.body;
  
  if (!database) {
    return res.status(400).json({
      success: false,
      error: { message: 'Database name is required' }
    });
  }
  
  const pool = dbManager.getPool(database);
  
  // Start transaction
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Update customer products (cust_pro_flag = 1)
    // Set advantage_flag based on base product's advantage_flag
    const [customerResult] = await connection.query(`
      UPDATE pms_sku AS derived
      INNER JOIN pms_sku AS base 
        ON derived.basic_sku_code = base.code 
        AND base.deleted = 0
      SET derived.advantage_flag = base.advantage_flag
      WHERE derived.cust_pro_flag = 1 
        AND derived.deleted = 0
        AND derived.basic_sku_code != ''
    `);
    
    // Update self-operated products (own_brand_flag = 1, but not customer products)
    // Set advantage_flag based on base product's advantage_flag
    const [selfOperatedResult] = await connection.query(`
      UPDATE pms_sku AS derived
      INNER JOIN pms_sku AS base 
        ON derived.basic_sku_code = base.code 
        AND base.deleted = 0
      SET derived.advantage_flag = base.advantage_flag
      WHERE derived.own_brand_flag = 1 
        AND derived.cust_pro_flag = 0
        AND derived.deleted = 0
        AND derived.basic_sku_code != ''
    `);
    
    await connection.commit();
    
    const totalUpdated = customerResult.changedRows + selfOperatedResult.changedRows;
    
    res.json({
      success: true,
      data: {
        database,
        customerProductsUpdated: customerResult.changedRows,
        selfOperatedProductsUpdated: selfOperatedResult.changedRows,
        totalUpdated,
        message: 'Advantage flag synchronized successfully'
      }
    });
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

module.exports = router;
