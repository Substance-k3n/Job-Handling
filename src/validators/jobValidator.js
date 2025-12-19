const { body } = require('express-validator');

const jobValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Job title is required')
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Job description is required')
    .isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),

  body('type')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship'])
    .withMessage('Invalid job type')
];

module.exports = { jobValidator };