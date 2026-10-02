/**
 * Health check controller
 * Returns the status of the EVE Healthcare API service
 */
const getHealth = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'EVE Healthcare API is running',
  });
};

module.exports = {
  getHealth,
};
