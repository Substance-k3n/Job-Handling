/**
 * Middleware to capture request metadata for audit logging
 * Extracts IP address and User-Agent from incoming requests
 */
const captureRequestMetadata = (req, res, next) => {
  req.auditMetadata = {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown',
    userAgent: req.get('User-Agent') || 'Unknown'
  };
  next();
};

module.exports = captureRequestMetadata;