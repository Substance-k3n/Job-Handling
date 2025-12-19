const { verifyToken } = require('../utils/tokenUtils');
const { errorResponse } = require('../utils/responseUtils');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 401, 'Not authorized, no token provided');
    }

    const decoded = verifyToken(token);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return errorResponse(res, 401, 'User not found');
    }

    next();
  } catch (error) {
    return errorResponse(res, 401, 'Not authorized, token invalid or expired');
  }
};

module.exports = { protect };