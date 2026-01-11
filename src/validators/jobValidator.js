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

  body('location')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('Location must be at least 3 characters'),

  body('type')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'internship'])
    .withMessage('Invalid job type'),

  body('work_mode')
    .optional()
    .isIn(['remote', 'onsite', 'hybrid'])
    .withMessage('Invalid work mode'),

  body('key_responsibilities')
    .optional()
    .isArray().withMessage('Key responsibilities must be an array'),

  body('what_we_offer')
    .optional()
    .isArray().withMessage('What we offer must be an array'),

  body('requirements')
    .optional()
    .isArray().withMessage('Requirements must be an array'),

  body('deadline')
    .optional()
    .isISO8601().withMessage('Deadline must be a valid date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Deadline must be in the future');
      }
      return true;
    })
];

module.exports = { jobValidator };