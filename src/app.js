const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const dbManager = require('./config/database');
const swaggerSpec = require('./config/swagger');
const queryRoutes = require('./routes/query');
const databaseRoutes = require('./routes/database');
const commonQueriesRoutes = require('./routes/commonQueries');
const contractRoutes = require('./routes/contracts');
const productRoutes = require('./routes/products');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Security headers (disable CSP for Swagger UI)
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies with increased limit
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies with increased limit

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Check if the server is running and healthy
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 123.456
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MySQL Multi-DB API Documentation'
}));

// API Routes
app.use('/api/query', queryRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/common-queries', commonQueriesRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/products', productRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close database connections
    await dbManager.closePools();
    console.log('All database connections closed');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Express MySQL Multi-Database Server...\n');
    
    // Initialize database connections
    console.log('📦 Initializing database connections...');
    const poolCount = await dbManager.initializePools();
    console.log(`✓ ${poolCount} database(s) initialized\n`);
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Swagger documentation: http://localhost:${PORT}/api-docs`);
      console.log('\n📋 Available endpoints:');
      console.log(`   GET  /health - Health check`);
      console.log(`   GET  /api-docs - Swagger API Documentation`);
      console.log(`   GET  /api/common-queries - List common query templates`);
      console.log(`   POST /api/common-queries/{id}/execute - Execute common query`);
      console.log(`   GET  /api/databases - List all databases`);
      console.log(`   GET  /api/databases/ddl - List DDL scripts (unified)`);
      console.log(`   POST /api/databases/ddl/execute - Execute DDL script`);
      console.log(`   POST /api/query/execute - Execute SQL query`);
      console.log(`   POST /api/query/batch - Execute batch queries`);
      console.log(`   POST /api/query/prepared - Execute prepared statement`);
      console.log(`   POST /api/contracts/calculate-cny - Calculate and save CNY amounts`);
      console.log(`   POST /api/contracts/calculate-detail-rmb - Calculate CNY amounts for contract details`);
      console.log(`   POST /api/contracts/recalculate-period - Recalculate RMB amounts for period`);
      console.log(`   POST /api/products/sync-advantage-flag - Sync advantage flag from base products`);
      console.log('\n✅ Server is ready to accept requests!\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
