const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responseUtils');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return errorResponse(res, 400, 'Validation failed', errorMessages);
  }
  
  next();
};

module.exports = validateRequest;