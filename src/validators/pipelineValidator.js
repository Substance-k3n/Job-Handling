const { body, param } = require('express-validator');

exports.validateMoveStage = [
  param('id')
    .isMongoId()
    .withMessage('Invalid application ID'),
  
  body('stage')
    .notEmpty()
    .withMessage('Stage is required')
    .isIn(['applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'])
    .withMessage('Invalid pipeline stage'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

exports.validateJobId = [
  param('jobId')
    .isMongoId()
    .withMessage('Invalid job ID')
];

exports.validateApplicationId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid application ID')
];