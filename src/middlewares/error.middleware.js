/**
 * 404 Not Found middleware for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

/**
 * Centralized error handling middleware
 * Catches unexpected server errors, formats standard JSON response,
 * and prevents leaking sensitive internal stack traces or secrets.
 */
const errorHandler = (err, req, res, next) => {
  // Log internal error on server console for debugging
  console.error('[Unhandled Error]:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
