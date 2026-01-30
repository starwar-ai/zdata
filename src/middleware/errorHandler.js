/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = null;

  // Handle specific error types
  if (err.code) {
    switch (err.code) {
      case 'ER_BAD_DB_ERROR':
        statusCode = 400;
        message = 'Database does not exist';
        break;
      case 'ER_ACCESS_DENIED_ERROR':
        statusCode = 401;
        message = 'Database access denied';
        break;
      case 'ER_PARSE_ERROR':
        statusCode = 400;
        message = 'SQL syntax error';
        details = err.sqlMessage;
        break;
      case 'ER_NO_SUCH_TABLE':
        statusCode = 404;
        message = 'Table does not exist';
        details = err.sqlMessage;
        break;
      case 'ER_DUP_ENTRY':
        statusCode = 409;
        message = 'Duplicate entry';
        details = err.sqlMessage;
        break;
      case 'ECONNREFUSED':
        statusCode = 503;
        message = 'Database connection refused';
        break;
      case 'ETIMEDOUT':
        statusCode = 504;
        message = 'Database connection timeout';
        break;
    }
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        code: err.code 
      })
    }
  });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      path: req.path,
      method: req.method
    }
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
