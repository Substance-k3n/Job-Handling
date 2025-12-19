const { errorResponse } = require('../utils/responseUtils');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'User not authenticated');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, 'Access denied. Insufficient permissions');
    }

    next();
  };
};

module.exports = { authorize };