const { body } = require('express-validator');

const applicationValidator = [
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Cover letter must not exceed 1000 characters')
];

const updateStatusValidator = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'reviewed', 'accepted', 'rejected'])
    .withMessage('Invalid status value'),
  
  body('adminNotes')
    .optional()
    .trim()
];

module.exports = { applicationValidator, updateStatusValidator };