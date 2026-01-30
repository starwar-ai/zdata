const express = require('express');
const router = express.Router();
const dbManager = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { convertToCNY, formatDateToYYYYMMDD, fetchExchangeRate } = require('../utils/exchangeRate');

/**
 * @swagger
 * /api/contracts/calculate-cny:
 *   post:
 *     summary: Calculate and save CNY total amounts for contracts
 *     tags: [Contracts]
 *     description: Process a list of contracts, calculate CNY amounts using exchange rates, and update the database
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contracts
 *               - database
 *             properties:
 *               database:
 *                 type: string
 *                 description: Database name to execute the update
 *                 example: local
 *               contracts:
 *                 type: array
 *                 description: List of contracts to process
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - total_amount
 *                     - purchase_time
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: Contract ID
 *                       example: 26215
 *                     code:
 *                       type: string
 *                       description: Contract code (optional, for tracking)
 *                       example: VK252015C-1
 *                     total_amount:
 *                       type: object
 *                       required:
 *                         - amount
 *                         - currency
 *                       properties:
 *                         amount:
 *                           type: number
 *                           description: Total amount
 *                           example: 1782.454
 *                         currency:
 *                           type: string
 *                           description: Currency code (3 letters)
 *                           example: USD
 *                     purchase_time:
 *                       type: string
 *                       format: date-time
 *                       description: Purchase date/time
 *                       example: 2025-12-22T09:15:26.000Z
 *                     tax_rate:
 *                       type: number
 *                       description: Tax rate (optional)
 *                       example: 0.13
 *                     total_amount_rmb:
 *                       type: object
 *                       description: Pre-calculated CNY amount (optional, if provided calculation will be skipped)
 *                       properties:
 *                         amount:
 *                           type: number
 *                           example: 12521.9175954
 *                         currency:
 *                           type: string
 *                           example: RMB
 *                         checkAmount:
 *                           type: number
 *                           example: 12521.92
 *           examples:

 
 *            
 *     responses:
 *       200:
 *         description: Contracts processed successfully
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
 *                     total_processed:
 *                       type: integer
 *                       description: Total number of contracts processed
 *                       example: 1
 *                     successful:
 *                       type: integer
 *                       description: Number of successful updates
 *                       example: 1
 *                     failed:
 *                       type: integer
 *                       description: Number of failed updates
 *                       example: 0
 *                     details:
 *                       type: array
 *                       description: Detailed results for each contract
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           code:
 *                             type: string
 *                           original_amount:
 *                             type: object
 *                           cny_amount:
 *                             type: object
 *                           exchange_rate:
 *                             type: number
 *                           rate_date:
 *                             type: string
 *                           status:
 *                             type: string
 *                     errors:
 *                       type: array
 *                       description: List of errors for failed contracts
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/calculate-cny', asyncHandler(async (req, res) => {
  const { contracts, database } = req.body || {};

  // Validate input
  if (!database) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Database parameter is required',
        field: 'database'
      }
    });
  }

  if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Contracts array is required and must not be empty',
        field: 'contracts'
      }
    });
  }

  // Get database pool
  const pool = dbManager.getPool(database);

  // Process results tracking
  const results = {
    total_processed: contracts.length,
    successful: 0,
    failed: 0,
    details: [],
    errors: []
  };

  // Process each contract
  for (const contract of contracts) {
    try {
      // Validate contract data
      if (!contract.id) {
        throw new Error('Contract ID is required');
      }
      if (!contract.total_amount || typeof contract.total_amount.amount !== 'number') {
        throw new Error('Contract total_amount.amount is required and must be a number');
      }
      if (!contract.total_amount.currency) {
        throw new Error('Contract total_amount.currency is required');
      }
      if (!contract.purchase_time) {
        throw new Error('Contract purchase_time is required');
      }

      // Extract data
      const { id, code, total_amount, purchase_time, tax_rate, total_amount_rmb } = contract;
      const { amount, currency } = total_amount;

      let cnyAmountObject;
      let purchaseDate = null;
      // Check if tax_rate is provided with valid value
      const numericTaxRate = Number(tax_rate);
      const hasTaxRate = !isNaN(numericTaxRate) && numericTaxRate !== 0;
      let finalTaxRate = hasTaxRate ? numericTaxRate : null;
      
      // If tax_rate not provided, check currency or fetch from API
      if (!hasTaxRate) {
        // If currency is RMB/CNY, set rate to 1
        if (currency && (currency.toUpperCase() === 'RMB' || currency.toUpperCase() === 'CNY')) {
          finalTaxRate = 1;
        } else {
          purchaseDate = formatDateToYYYYMMDD(purchase_time);
          const fetchExchangeRateResult = await fetchExchangeRate(purchaseDate, currency, 'CNY');
          if (fetchExchangeRateResult !== null && !isNaN(fetchExchangeRateResult.rate)) {
            finalTaxRate = fetchExchangeRateResult.rate;
          }
        }
      }

      // Check if total_amount_rmb is already provided with valid value
      const hasValidRmb = total_amount_rmb && 
        total_amount_rmb.amount !== undefined && 
        total_amount_rmb.amount !== null && 
        !isNaN(total_amount_rmb.amount) &&
        total_amount_rmb.currency;
      
      if (hasValidRmb) {
        // Use pre-calculated RMB amount, skip conversion
        cnyAmountObject = {
          amount: total_amount_rmb.amount,
          currency: total_amount_rmb.currency,
          checkAmount: total_amount_rmb.checkAmount || Math.round(total_amount_rmb.amount * 100) / 100
        };
      } else {
        // Need to calculate - convert purchase_time to YYYY-MM-DD format
        if (!purchaseDate) {
          purchaseDate = formatDateToYYYYMMDD(purchase_time);
        }

        // Convert to CNY using exchange rate
        const cnyAmount = amount * finalTaxRate;
    
        // Calculate checkAmount (rounded to 2 decimal places)
        const checkAmount = Math.round(cnyAmount * 100) / 100;

        // Build CNY amount object
        cnyAmountObject = {
          amount: cnyAmount,
          currency: 'RMB',
          checkAmount: checkAmount
        };
      } 

      // Update database - only update fields that need updating
      let sql, params;
      const shouldUpdateTaxRate = !hasTaxRate && finalTaxRate !== undefined && finalTaxRate !== null;
      const shouldUpdateRmb = !hasValidRmb;
      
      if (shouldUpdateTaxRate && shouldUpdateRmb) {
        sql = 'UPDATE scm_purchase_contract SET total_amount_rmb = ?, tax_rate = ? WHERE id = ?';
        params = [JSON.stringify(cnyAmountObject), finalTaxRate, id];
      } else if (shouldUpdateTaxRate) {
        sql = 'UPDATE scm_purchase_contract SET tax_rate = ? WHERE id = ?';
        params = [finalTaxRate, id];
      } else if (shouldUpdateRmb) {
        sql = 'UPDATE scm_purchase_contract SET total_amount_rmb = ? WHERE id = ?';
        params = [JSON.stringify(cnyAmountObject), id];
      } else {
        // Nothing to update - both values already exist
        results.successful++;
        results.details.push({
          id,
          code: code || null,
          original_amount: { amount, currency },
          cny_amount: cnyAmountObject,
          status: 'success',
          message: 'No update needed - values already exist'
        });
        continue;
      }
      
      const [updateResult] = await pool.query(sql, params);

      // Check if update was successful
      if (updateResult.affectedRows === 0) {
        throw new Error(`Contract with ID ${id} not found in database`);
      }

      // Record success
      results.successful++;
      
      const detailObject = {
        id,
        code: code || null,
        original_amount: {
          amount,
          currency
        },
        cny_amount: cnyAmountObject,
        status: 'success'
      };


      results.details.push(detailObject);

    } catch (error) {
      // Record failure
      results.failed++;
      results.errors.push({
        id: contract.id || 'unknown',
        code: contract.code || null,
        error: error.message,
        status: 'failed'
      });

      // Add failed detail
      results.details.push({
        id: contract.id || 'unknown',
        code: contract.code || null,
        original_amount: contract.total_amount || null,
        error: error.message,
        status: 'failed'
      });
    }
  }

  // Return results
  res.json({
    success: results.failed === 0,
    data: results,
    message: results.failed === 0 
      ? `Successfully processed ${results.successful} contract(s)`
      : `Processed ${results.total_processed} contract(s): ${results.successful} successful, ${results.failed} failed`
  });
}));

/**
 * @swagger
 * /api/contracts/calculate-detail-rmb:
 *   post:
 *     summary: Calculate and save CNY amounts for contract detail items
 *     tags: [Contracts]
 *     description: Process a list of contracts, calculate CNY amounts for their detail items using exchange rates, and update the database
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contracts
 *               - database
 *             properties:
 *               database:
 *                 type: string
 *                 description: Database name to execute the update
 *                 example: local
 *               contracts:
 *                 type: array
 *                 description: List of parent contracts to process
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - total_amount
 *                     - purchase_time
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: Contract ID
 *                       example: 26215
 *                     code:
 *                       type: string
 *                       description: Contract code (optional, for tracking)
 *                       example: VK252015C-1
 *                     total_amount:
 *                       type: object
 *                       required:
 *                         - amount
 *                         - currency
 *                       properties:
 *                         amount:
 *                           type: number
 *                           description: Total amount
 *                           example: 1782.454
 *                         currency:
 *                           type: string
 *                           description: Currency code (3 letters)
 *                           example: USD
 *                     purchase_time:
 *                       type: string
 *                       format: date-time
 *                       description: Purchase date/time
 *                       example: 2025-12-22T09:15:26.000Z
 *                     tax_rate:
 *                       type: number
 *                       description: Tax rate (exchange rate)
 *                       example: 7.03
 *           examples:
 *             singleContract:
 *               summary: Single USD contract
 *               value:
 *                 database: local
 *                 contracts:
 *                   - id: 26215
 *                     code: VK252015C-1
 *                     total_amount:
 *                       amount: 1782.454
 *                       currency: USD
 *                     purchase_time: "2025-12-22T09:15:26.000Z"
 *                     tax_rate: 7.03
 *     responses:
 *       200:
 *         description: Contract details processed successfully
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
 *                     total_contracts:
 *                       type: integer
 *                       description: Total number of contracts processed
 *                       example: 1
 *                     total_details_processed:
 *                       type: integer
 *                       description: Total number of detail items processed
 *                       example: 5
 *                     successful:
 *                       type: integer
 *                       description: Number of successful updates
 *                       example: 5
 *                     failed:
 *                       type: integer
 *                       description: Number of failed updates
 *                       example: 0
 *                     details:
 *                       type: array
 *                       description: Detailed results for each contract
 *                       items:
 *                         type: object
 *                         properties:
 *                           contract_id:
 *                             type: integer
 *                           contract_code:
 *                             type: string
 *                           items_processed:
 *                             type: integer
 *                           items_updated:
 *                             type: array
 *                           status:
 *                             type: string
 *                     errors:
 *                       type: array
 *                       description: List of errors for failed items
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/calculate-detail-rmb', asyncHandler(async (req, res) => {
  const { contracts, database } = req.body || {};

  // Validate input
  if (!database) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Database parameter is required',
        field: 'database'
      }
    });
  }

  if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Contracts array is required and must not be empty',
        field: 'contracts'
      }
    });
  }

  // Get database pool
  const pool = dbManager.getPool(database);

  // Process results tracking
  const results = {
    total_contracts: contracts.length,
    total_details_processed: 0,
    successful: 0,
    failed: 0,
    details: [],
    errors: []
  };

  // Process each contract
  for (const contract of contracts) {
    try {
      // Validate contract data
      if (!contract.id) {
        throw new Error('Contract ID is required');
      }
      if (!contract.total_amount || !contract.total_amount.currency) {
        throw new Error('Contract total_amount.currency is required');
      }
      if (!contract.purchase_time) {
        throw new Error('Contract purchase_time is required');
      }

      // Extract data
      const { id, code, total_amount, purchase_time, tax_rate } = contract;
      const { currency } = total_amount;

      // Check if tax_rate is provided with valid value
      const numericTaxRate = Number(tax_rate);
      const hasTaxRate = !isNaN(numericTaxRate) && numericTaxRate !== 0;
      let exchangeRate = hasTaxRate ? numericTaxRate : null;
      let purchaseDate = formatDateToYYYYMMDD(purchase_time);
      
      // If tax_rate not provided, check currency or fetch exchange rate from API
      if (!hasTaxRate) {
        // If currency is RMB/CNY, set rate to 1
        if (currency && (currency.toUpperCase() === 'RMB' || currency.toUpperCase() === 'CNY')) {
          exchangeRate = 1;
        } else {
          const fetchExchangeRateResult = await fetchExchangeRate(purchaseDate, currency, 'CNY');
          if (fetchExchangeRateResult !== null && !isNaN(fetchExchangeRateResult.rate)) {
            exchangeRate = fetchExchangeRateResult.rate;
          } else {
            throw new Error(`Failed to fetch exchange rate for ${currency} on ${purchaseDate}`);
          }
        }
      }

      // Query all detail items for this contract
      const [detailItems] = await pool.query(
        'SELECT id, with_tax_price, quantity FROM scm_purchase_contract_item WHERE purchase_contract_id = ? AND deleted = 0',
        [id]
      );

      if (detailItems.length === 0) {
        results.details.push({
          contract_id: id,
          contract_code: code || null,
          items_processed: 0,
          items_updated: [],
          status: 'success',
          message: 'No detail items found for this contract'
        });
        continue;
      }

      const itemsUpdated = [];
      let itemsFailed = 0;

      // Process each detail item
      for (const item of detailItems) {
        try {
          results.total_details_processed++;

          // Parse with_tax_price JSON
          let withTaxPrice = item.with_tax_price;
          if (typeof withTaxPrice === 'string') {
            withTaxPrice = JSON.parse(withTaxPrice);
          }

          // Skip if no valid with_tax_price
          if (!withTaxPrice || withTaxPrice.amount === undefined || withTaxPrice.amount === null) {
            itemsUpdated.push({
              detail_id: item.id,
              status: 'skipped',
              message: 'No valid with_tax_price'
            });
            continue;
          }

          // Skip if no valid quantity
          const quantity = Number(item.quantity);
          if (isNaN(quantity) || quantity === 0) {
            itemsUpdated.push({
              detail_id: item.id,
              status: 'skipped',
              message: 'No valid quantity'
            });
            continue;
          }

          // Calculate total_price_rmb
          const rmbAmount = withTaxPrice.amount * exchangeRate * quantity;
          const checkAmount = Math.round(rmbAmount * 100) / 100;

          const totalPriceRmb = {
            amount: rmbAmount,
            currency: 'RMB',
            checkAmount: checkAmount
          };

          // Update database
          const [updateResult] = await pool.query(
            'UPDATE scm_purchase_contract_item SET total_price_rmb = ? WHERE id = ?',
            [JSON.stringify(totalPriceRmb), item.id]
          );

          if (updateResult.affectedRows > 0) {
            results.successful++;
            itemsUpdated.push({
              detail_id: item.id,
              original_amount: withTaxPrice,
              rmb_amount: totalPriceRmb,
              exchange_rate: exchangeRate,
              quantity: quantity,
              status: 'success'
            });
          } else {
            itemsFailed++;
            itemsUpdated.push({
              detail_id: item.id,
              status: 'failed',
              message: 'Update affected 0 rows'
            });
          }
        } catch (itemError) {
          results.failed++;
          itemsFailed++;
          itemsUpdated.push({
            detail_id: item.id,
            status: 'failed',
            error: itemError.message
          });
        }
      }

      results.details.push({
        contract_id: id,
        contract_code: code || null,
        exchange_rate: exchangeRate,
        rate_date: purchaseDate,
        items_processed: detailItems.length,
        items_updated: itemsUpdated,
        status: itemsFailed === 0 ? 'success' : 'partial'
      });

    } catch (error) {
      // Record contract-level failure
      results.failed++;
      results.errors.push({
        contract_id: contract.id || 'unknown',
        contract_code: contract.code || null,
        error: error.message,
        status: 'failed'
      });

      results.details.push({
        contract_id: contract.id || 'unknown',
        contract_code: contract.code || null,
        error: error.message,
        status: 'failed'
      });
    }
  }

  // Return results
  res.json({
    success: results.failed === 0 && results.errors.length === 0,
    data: results,
    message: results.errors.length === 0 
      ? `Successfully processed ${results.total_contracts} contract(s), updated ${results.successful} detail item(s)`
      : `Processed ${results.total_contracts} contract(s): ${results.successful} successful, ${results.failed} failed`
  });
}));

/**
 * @swagger
 * /api/contracts/recalculate-period:
 *   post:
 *     summary: Automatically recalculate RMB amounts for contracts and their details within a specified period
 *     tags: [Contracts]
 *     description: Query all purchase contracts within the specified date range and automatically recalculate RMB amounts for contracts, exchange rates, and contract detail items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - database
 *               - start_date
 *               - end_date
 *             properties:
 *               database:
 *                 type: string
 *                 description: Database name to execute the operation
 *                 example: local
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Start date of the period (YYYY-MM-DD)
 *                 example: "2025-01-01"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: End date of the period (YYYY-MM-DD)
 *                 example: "2025-12-31"
 *               force_recalculate:
 *                 type: boolean
 *                 description: Force recalculation even if values already exist
 *                 default: false
 *                 example: false
 *           examples:
 *             periodRecalculation:
 *               summary: Recalculate contracts for a specific period
 *               value:
 *                 database: local
 *                 start_date: "2025-01-01"
 *                 end_date: "2025-12-31"
 *                 force_recalculate: false
 *     responses:
 *       200:
 *         description: Recalculation completed successfully
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
 *                     period:
 *                       type: object
 *                       properties:
 *                         start_date:
 *                           type: string
 *                         end_date:
 *                           type: string
 *                     contracts_found:
 *                       type: integer
 *                       description: Total number of contracts found in the period
 *                     contracts_processed:
 *                       type: integer
 *                       description: Number of contracts processed
 *                     contracts_updated:
 *                       type: integer
 *                       description: Number of contracts updated
 *                     details_processed:
 *                       type: integer
 *                       description: Number of detail items processed
 *                     details_updated:
 *                       type: integer
 *                       description: Number of detail items updated
 *                     failed:
 *                       type: integer
 *                       description: Number of failed operations
 *                     details:
 *                       type: array
 *                       description: Detailed results for each contract
 *                     errors:
 *                       type: array
 *                       description: List of errors
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/recalculate-period', asyncHandler(async (req, res) => {
  const { database, start_date, end_date, force_recalculate = false } = req.body || {};

  // Validate input
  if (!database) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Database parameter is required',
        field: 'database'
      }
    });
  }

  if (!start_date || !end_date) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Both start_date and end_date are required',
        fields: ['start_date', 'end_date']
      }
    });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Dates must be in YYYY-MM-DD format',
        fields: ['start_date', 'end_date']
      }
    });
  }

  // Get database pool
  const pool = dbManager.getPool(database);

  // Process results tracking
  const results = {
    period: {
      start_date,
      end_date
    },
    contracts_found: 0,
    contracts_processed: 0,
    contracts_updated: 0,
    details_processed: 0,
    details_updated: 0,
    failed: 0,
    details: [],
    errors: []
  };

  try {
    // Query all contracts within the specified period
    const [contracts] = await pool.query(
      `SELECT id, code, total_amount, purchase_time, currency, tax_rate, total_amount_rmb 
       FROM scm_purchase_contract 
       WHERE purchase_time >= ? AND purchase_time <= ? AND deleted = 0`,
      [start_date, end_date]
    );

    results.contracts_found = contracts.length;

    if (contracts.length === 0) {
      return res.json({
        success: true,
        data: results,
        message: `No contracts found in the period ${start_date} to ${end_date}`
      });
    }

    // Process each contract
    for (const contract of contracts) {
      results.contracts_processed++;
      
      try {
        // Parse JSON fields
        let totalAmount = contract.total_amount;
        if (typeof totalAmount === 'string') {
          totalAmount = JSON.parse(totalAmount);
        }

        let totalAmountRmb = contract.total_amount_rmb;
        if (typeof totalAmountRmb === 'string') {
          totalAmountRmb = JSON.parse(totalAmountRmb);
        }

        // Skip if no valid total_amount
        if (!totalAmount || !totalAmount.amount || !totalAmount.currency) {
          results.details.push({
            contract_id: contract.id,
            contract_code: contract.code,
            status: 'skipped',
            message: 'No valid total_amount'
          });
          continue;
        }

        const { amount, currency } = totalAmount;
        const purchaseDate = formatDateToYYYYMMDD(contract.purchase_time);

        // Determine if we need to recalculate
        const hasValidRmb = totalAmountRmb && 
          totalAmountRmb.amount !== undefined && 
          totalAmountRmb.amount !== null && 
          !isNaN(totalAmountRmb.amount);
        
        const numericTaxRate = Number(contract.tax_rate);
        const hasTaxRate = !isNaN(numericTaxRate) && numericTaxRate !== 0;

        // Skip if values already exist and not forcing recalculation
        if (!force_recalculate && hasValidRmb && hasTaxRate) {
          results.details.push({
            contract_id: contract.id,
            contract_code: contract.code,
            status: 'skipped',
            message: 'Values already exist (use force_recalculate to override)'
          });
          continue;
        }

        // Calculate exchange rate
        let exchangeRate = hasTaxRate ? numericTaxRate : null;
        
        if (!hasTaxRate || force_recalculate) {
          // If currency is RMB/CNY, set rate to 1
          if (currency.toUpperCase() === 'RMB' || currency.toUpperCase() === 'CNY') {
            exchangeRate = 1;
          } else {
            const fetchExchangeRateResult = await fetchExchangeRate(purchaseDate, currency, 'CNY');
            if (fetchExchangeRateResult !== null && !isNaN(fetchExchangeRateResult.rate)) {
              exchangeRate = fetchExchangeRateResult.rate;
            } else {
              throw new Error(`Failed to fetch exchange rate for ${currency} on ${purchaseDate}`);
            }
          }
        }

        // Calculate CNY amount
        const cnyAmount = amount * exchangeRate;
        const checkAmount = Math.round(cnyAmount * 100) / 100;

        const cnyAmountObject = {
          amount: cnyAmount,
          currency: 'RMB',
          checkAmount: checkAmount
        };

        // Update contract in database
        const [updateResult] = await pool.query(
          'UPDATE scm_purchase_contract SET total_amount_rmb = ?, tax_rate = ? WHERE id = ?',
          [JSON.stringify(cnyAmountObject), exchangeRate, contract.id]
        );

        if (updateResult.affectedRows > 0) {
          results.contracts_updated++;
        }

        // Now process contract detail items
        const [detailItems] = await pool.query(
          'SELECT id, with_tax_price, quantity, total_price_rmb FROM scm_purchase_contract_item WHERE purchase_contract_id = ? AND deleted = 0',
          [contract.id]
        );

        const itemsUpdated = [];
        let itemsUpdatedCount = 0;

        for (const item of detailItems) {
          results.details_processed++;

          try {
            // Parse with_tax_price JSON
            let withTaxPrice = item.with_tax_price;
            if (typeof withTaxPrice === 'string') {
              withTaxPrice = JSON.parse(withTaxPrice);
            }

            let totalPriceRmb = item.total_price_rmb;
            if (typeof totalPriceRmb === 'string') {
              totalPriceRmb = JSON.parse(totalPriceRmb);
            }

            // Skip if no valid with_tax_price
            if (!withTaxPrice || withTaxPrice.amount === undefined || withTaxPrice.amount === null) {
              itemsUpdated.push({
                detail_id: item.id,
                status: 'skipped',
                message: 'No valid with_tax_price'
              });
              continue;
            }

            // Skip if no valid quantity
            const quantity = Number(item.quantity);
            if (isNaN(quantity) || quantity === 0) {
              itemsUpdated.push({
                detail_id: item.id,
                status: 'skipped',
                message: 'No valid quantity'
              });
              continue;
            }

            // Check if already has valid total_price_rmb
            const hasValidItemRmb = totalPriceRmb && 
              totalPriceRmb.amount !== undefined && 
              totalPriceRmb.amount !== null && 
              !isNaN(totalPriceRmb.amount);

            if (!force_recalculate && hasValidItemRmb) {
              itemsUpdated.push({
                detail_id: item.id,
                status: 'skipped',
                message: 'Value already exists'
              });
              continue;
            }

            // Calculate total_price_rmb
            const rmbAmount = withTaxPrice.amount * exchangeRate * quantity;
            const itemCheckAmount = Math.round(rmbAmount * 100) / 100;

            const totalPriceRmbObject = {
              amount: rmbAmount,
              currency: 'RMB',
              checkAmount: itemCheckAmount
            };

            // Update database
            const [itemUpdateResult] = await pool.query(
              'UPDATE scm_purchase_contract_item SET total_price_rmb = ? WHERE id = ?',
              [JSON.stringify(totalPriceRmbObject), item.id]
            );

            if (itemUpdateResult.affectedRows > 0) {
              results.details_updated++;
              itemsUpdatedCount++;
              itemsUpdated.push({
                detail_id: item.id,
                rmb_amount: totalPriceRmbObject,
                status: 'success'
              });
            }
          } catch (itemError) {
            results.failed++;
            itemsUpdated.push({
              detail_id: item.id,
              status: 'failed',
              error: itemError.message
            });
          }
        }

        // Add contract result
        results.details.push({
          contract_id: contract.id,
          contract_code: contract.code,
          original_amount: { amount, currency },
          cny_amount: cnyAmountObject,
          exchange_rate: exchangeRate,
          rate_date: purchaseDate,
          detail_items_found: detailItems.length,
          detail_items_updated: itemsUpdatedCount,
          items: itemsUpdated,
          status: 'success'
        });

      } catch (contractError) {
        results.failed++;
        results.errors.push({
          contract_id: contract.id,
          contract_code: contract.code,
          error: contractError.message,
          status: 'failed'
        });

        results.details.push({
          contract_id: contract.id,
          contract_code: contract.code,
          error: contractError.message,
          status: 'failed'
        });
      }
    }

    // Return results
    res.json({
      success: results.failed === 0 && results.errors.length === 0,
      data: results,
      message: results.errors.length === 0
        ? `Successfully processed ${results.contracts_processed} contract(s), updated ${results.contracts_updated} contract(s) and ${results.details_updated} detail item(s)`
        : `Processed ${results.contracts_processed} contract(s): ${results.contracts_updated} contracts updated, ${results.details_updated} details updated, ${results.failed} failed`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process contracts',
        details: error.message
      }
    });
  }
}));

/**
 * @swagger
 * /api/contracts/fix-null-currency:
 *   post:
 *     summary: Fix contracts with null currency and recalculate RMB amounts
 *     tags: [Contracts]
 *     description: Query purchase contracts within a specified period where total_amount.currency is null, set currency from the currency field, fetch exchange rate from API, and recalculate RMB amounts for contracts and their detail items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - database
 *               - start_date
 *               - end_date
 *             properties:
 *               database:
 *                 type: string
 *                 description: Database name to execute the operation
 *                 example: local
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Start date of the period (YYYY-MM-DD)
 *                 example: "2025-01-01"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: End date of the period (YYYY-MM-DD)
 *                 example: "2025-12-31"
 *           examples:
 *             fixNullCurrency:
 *               summary: Fix contracts with null currency in a specific period
 *               value:
 *                 database: local
 *                 start_date: "2025-01-01"
 *                 end_date: "2025-12-31"
 *     responses:
 *       200:
 *         description: Operation completed successfully
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
 *                     period:
 *                       type: object
 *                       properties:
 *                         start_date:
 *                           type: string
 *                         end_date:
 *                           type: string
 *                     contracts_found:
 *                       type: integer
 *                       description: Total number of contracts with null currency found
 *                     contracts_processed:
 *                       type: integer
 *                       description: Number of contracts processed
 *                     contracts_updated:
 *                       type: integer
 *                       description: Number of contracts updated
 *                     details_processed:
 *                       type: integer
 *                       description: Number of detail items processed
 *                     details_updated:
 *                       type: integer
 *                       description: Number of detail items updated
 *                     failed:
 *                       type: integer
 *                       description: Number of failed operations
 *                     details:
 *                       type: array
 *                       description: Detailed results for each contract
 *                     errors:
 *                       type: array
 *                       description: List of errors
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/fix-null-currency', asyncHandler(async (req, res) => {
  const { database, start_date, end_date } = req.body || {};

  // Validate input
  if (!database) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Database parameter is required',
        field: 'database'
      }
    });
  }

  if (!start_date || !end_date) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Both start_date and end_date are required',
        fields: ['start_date', 'end_date']
      }
    });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Dates must be in YYYY-MM-DD format',
        fields: ['start_date', 'end_date']
      }
    });
  }

  // Get database pool
  const pool = dbManager.getPool(database);

  // Process results tracking
  const results = {
    period: {
      start_date,
      end_date
    },
    contracts_found: 0,
    contracts_processed: 0,
    contracts_updated: 0,
    details_processed: 0,
    details_updated: 0,
    failed: 0,
    details: [],
    errors: []
  };

  try {
    // Query all contracts within the specified period where total_amount.currency is null
    const [contracts] = await pool.query(
      `SELECT id, code, total_amount, purchase_time, tax_rate, total_amount_rmb, currency 
       FROM scm_purchase_contract 
       WHERE purchase_time >= ? AND purchase_time <= ? 
       AND deleted = 0
       AND (total_amount -> '$.currency' IS NULL OR JSON_UNQUOTE(total_amount -> '$.currency') = 'null')`,
      [start_date, end_date]
    );

    results.contracts_found = contracts.length;

    if (contracts.length === 0) {
      return res.json({
        success: true,
        data: results,
        message: `No contracts with null currency found in the period ${start_date} to ${end_date}`
      });
    }

    // Process each contract
    for (const contract of contracts) {
      results.contracts_processed++;
      
      try {
        // Parse JSON fields
        let totalAmount = contract.total_amount;
        if (typeof totalAmount === 'string') {
          totalAmount = JSON.parse(totalAmount);
        }

        // Validate total_amount has required fields
        if (!totalAmount || totalAmount.amount === undefined || totalAmount.amount === null) {
          results.details.push({
            contract_id: contract.id,
            contract_code: contract.code,
            status: 'skipped',
            message: 'No valid total_amount.amount'
          });
          continue;
        }

        // Validate currency field exists
        if (!contract.currency) {
          throw new Error('currency field is empty, cannot proceed');
        }

        // Set currency to the contract.currency value
        const updatedTotalAmount = {
          ...totalAmount,
          currency: contract.currency
        };

        const { amount } = totalAmount;
        const purchaseDate = formatDateToYYYYMMDD(contract.purchase_time);

        // Fetch exchange rate from API based on currency
        let exchangeRate;
        const currency = contract.currency.toUpperCase();
        
        if (currency === 'RMB' || currency === 'CNY') {
          // RMB shortcut - no API call needed
          exchangeRate = 1;
        } else {
          // Fetch exchange rate from API
          const fetchExchangeRateResult = await fetchExchangeRate(purchaseDate, currency, 'CNY');
          if (fetchExchangeRateResult !== null && !isNaN(fetchExchangeRateResult.rate)) {
            exchangeRate = fetchExchangeRateResult.rate;
          } else {
            throw new Error(`Failed to fetch exchange rate for ${currency} on ${purchaseDate}`);
          }
        }

        // Calculate CNY amount
        const cnyAmount = amount * exchangeRate;
        const checkAmount = Math.round(cnyAmount * 100) / 100;

        const cnyAmountObject = {
          amount: cnyAmount,
          currency: 'RMB',
          checkAmount: checkAmount
        };

        // Update contract in database - update both total_amount and total_amount_rmb
        const [updateResult] = await pool.query(
          'UPDATE scm_purchase_contract SET total_amount = ?, total_amount_rmb = ? WHERE id = ?',
          [JSON.stringify(updatedTotalAmount), JSON.stringify(cnyAmountObject), contract.id]
        );

        if (updateResult.affectedRows > 0) {
          results.contracts_updated++;
        }

        // Now process contract detail items
        const [detailItems] = await pool.query(
          'SELECT id, with_tax_price, quantity, total_price_rmb FROM scm_purchase_contract_item WHERE purchase_contract_id = ? AND deleted = 0',
          [contract.id]
        );

        const itemsUpdated = [];
        let itemsUpdatedCount = 0;

        for (const item of detailItems) {
          results.details_processed++;

          try {
            // Parse with_tax_price JSON
            let withTaxPrice = item.with_tax_price;
            if (typeof withTaxPrice === 'string') {
              withTaxPrice = JSON.parse(withTaxPrice);
            }

            // Skip if no valid with_tax_price
            if (!withTaxPrice || withTaxPrice.amount === undefined || withTaxPrice.amount === null) {
              itemsUpdated.push({
                detail_id: item.id,
                status: 'skipped',
                message: 'No valid with_tax_price'
              });
              continue;
            }

            // Skip if no valid quantity
            const quantity = Number(item.quantity);
            if (isNaN(quantity) || quantity === 0) {
              itemsUpdated.push({
                detail_id: item.id,
                status: 'skipped',
                message: 'No valid quantity'
              });
              continue;
            }

            // Calculate total_price_rmb
            const rmbAmount = withTaxPrice.amount * exchangeRate * quantity;
            const itemCheckAmount = Math.round(rmbAmount * 100) / 100;

            const totalPriceRmbObject = {
              amount: rmbAmount,
              currency: 'RMB',
              checkAmount: itemCheckAmount
            };

            // Update database
            const [itemUpdateResult] = await pool.query(
              'UPDATE scm_purchase_contract_item SET total_price_rmb = ? WHERE id = ?',
              [JSON.stringify(totalPriceRmbObject), item.id]
            );

            if (itemUpdateResult.affectedRows > 0) {
              results.details_updated++;
              itemsUpdatedCount++;
              itemsUpdated.push({
                detail_id: item.id,
                rmb_amount: totalPriceRmbObject,
                status: 'success'
              });
            }
          } catch (itemError) {
            results.failed++;
            itemsUpdated.push({
              detail_id: item.id,
              status: 'failed',
              error: itemError.message
            });
          }
        }

        // Add contract result
        results.details.push({
          contract_id: contract.id,
          contract_code: contract.code,
          original_currency: null,
          new_currency: contract.currency,
          original_amount: { amount, currency: null },
          updated_amount: updatedTotalAmount,
          cny_amount: cnyAmountObject,
          exchange_rate: exchangeRate,
          rate_date: purchaseDate,
          detail_items_found: detailItems.length,
          detail_items_updated: itemsUpdatedCount,
          items: itemsUpdated,
          status: 'success'
        });

      } catch (contractError) {
        results.failed++;
        results.errors.push({
          contract_id: contract.id,
          contract_code: contract.code,
          error: contractError.message,
          status: 'failed'
        });

        results.details.push({
          contract_id: contract.id,
          contract_code: contract.code,
          error: contractError.message,
          status: 'failed'
        });
      }
    }

    // Return results
    res.json({
      success: results.failed === 0 && results.errors.length === 0,
      data: results,
      message: results.errors.length === 0
        ? `Successfully processed ${results.contracts_processed} contract(s), updated ${results.contracts_updated} contract(s) and ${results.details_updated} detail item(s)`
        : `Processed ${results.contracts_processed} contract(s): ${results.contracts_updated} contracts updated, ${results.details_updated} details updated, ${results.failed} failed`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process contracts',
        details: error.message
      }
    });
  }
}));

module.exports = router;
