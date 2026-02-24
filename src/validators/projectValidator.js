
const { body } = require('express-validator');

exports.projectValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 3 }).withMessage('Name must be at least 3 characters')
    .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Project description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  
  body('imageUrl')
    .optional()
    .trim()
    .isURL().withMessage('Image URL must be valid'),
  
  body('status')
    .optional()
    .isIn(['ACTIVE', 'BLOCKED', 'CLOSED'])
    .withMessage('Status must be ACTIVE, BLOCKED, or CLOSED')
];

exports.milestoneValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Milestone title is required')
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  
  body('description')
    .optional()
    .trim()
];