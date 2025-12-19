const User = require('../models/User');
const { generateToken } = require('../utils/tokenUtils');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 400, 'User with this email already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user'
    });

    const token = generateToken(user._id, user.role);

    return successResponse(res, 201, 'User registered successfully', {
      user,
      token
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    const token = generateToken(user._id, user.role);
    user.password = undefined;

    return successResponse(res, 200, 'Login successful', {
      user,
      token
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    return successResponse(res, 200, 'User profile retrieved', user);
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };