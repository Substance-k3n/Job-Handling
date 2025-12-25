/**
 * @desc    Extracts IP and User-Agent from request
 * @usage   Attach to protected routes to capture metadata for audit logs
 */
const captureRequestMetadata = (req, res, next) => {
  req.auditMetadata = {
    ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
    userAgent: req.get('User-Agent') || 'Unknown'
  };
  next();
};

module.exports = captureRequestMetadata;