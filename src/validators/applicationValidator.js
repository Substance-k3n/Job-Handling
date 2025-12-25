const { body } = require('express-validator');

const applicationValidator = [
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Cover letter must not exceed 1000 characters'),
  
  body('jobId')
    .notEmpty().withMessage('Job ID is required')
    .isMongoId().withMessage('Invalid Job ID format')
];

const updateStageValidator = [
  body('stage')
    .notEmpty().withMessage('Stage is required')
    .isIn(['applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'])
    .withMessage('Invalid pipeline stage value'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Notes must be at least 2 characters if provided')
];

module.exports = { applicationValidator, updateStageValidator };