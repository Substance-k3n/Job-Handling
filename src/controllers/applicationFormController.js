const JobField = require('../models/JobField');
const Job = require('../models/Job');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { createAuditLog } = require('../utils/auditLogger');
const mongoose = require('mongoose');

/**
 * @desc    Create or update application form for a job
 * @route   POST /api/application-forms
 * @access  Private/Admin
 */
exports.createOrUpdateForm = async (req, res, next) => {
  try {
    const { jobId, title, description, sections, settings } = req.body;

    // Validate job exists
   // ADD THIS:
if (!mongoose.Types.ObjectId.isValid(jobId)) {
    return errorResponse(res, 400, 'Invalid job ID');
}

const jobExists = await Job.findById(jobId);
if (!jobExists) {
    return errorResponse(res, 404, 'Job not found');
}

// Check if form already exists using jobId
let form = await JobField.findOne({ jobId: jobId });


    if (form) {
      // Update existing form
      form.title = title || form.title;
      form.description = description || form.description;
      form.sections = sections || form.sections;
      form.settings = { ...form.settings, ...settings };
      await form.save();

      
      await createAuditLog({
        user: req.user._id,
        action: 'FORM_UPDATED',
        resource: 'JobField',
        resourceId: form._id,
        ipAddress: req.auditMetadata?.ipAddress,
        userAgent: req.auditMetadata?.userAgent,
        details: {
          jobTitle: jobExists.title,
          formTitle: form.title
        },
        severity: 'low'
      });

      return successResponse(res, 200, 'Application form updated successfully', form);

    }  else {
    // Create new form
    form = await JobField.create({
        jobId: jobId, // Use jobId here
        title: title || `Application for ${jobExists.title}`,
        description,
        sections, // Use sections if that's what your Postman body sends
        settings,
        created_by: req.user._id
    });

      await createAuditLog({
        user: req.user._id,
        action: 'FORM_CREATED',
        resource: 'JobField',
        resourceId: form._id,
        ipAddress: req.auditMetadata?.ipAddress,
        userAgent: req.auditMetadata?.userAgent,
        details: {
          jobTitle: jobExists.title,
          formTitle: form.title
        },
        severity: 'low'
      });

      return successResponse(res, 201, 'Application form created successfully', form);
    }

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get application form for a job
 * @route   GET /api/application-forms/job/:jobId
 * @access  Public (candidates need to see the form)
 */
exports.getFormByJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return errorResponse(res, 400, 'Invalid job ID');
    }

    const form = await JobField.findOne({ job: jobId, is_active: true })
      .populate('job', 'title company description')
      .lean();

    if (!form) {
      // Return default form if no custom form exists
      const job = await Job.findById(jobId).select('title company description');
      if (!job) {
        return errorResponse(res, 404, 'Job not found');
      }

      return successResponse(res, 200, 'Default application form', {
        job: {
          _id: job._id,
          title: job.title,
          company: job.company
        },
        title: `Application for ${job.title}`,
        description: 'Please submit your application',
        sections: [],
        settings: {
          require_cv: true,
          require_cover_letter: false
        },
        is_default: true
      });
    }

    // Sort sections and questions by order
    form.sections.sort((a, b) => a.order - b.order);
    form.sections.forEach(section => {
      section.questions.sort((a, b) => a.order - b.order);
    });

    return successResponse(res, 200, 'Application form retrieved', form);

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get form by ID (for editing)
 * @route   GET /api/application-forms/:id
 * @access  Private/Admin
 */
exports.getFormById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 400, 'Invalid form ID');
    }

    const form = await JobField.findById(id)
      .populate('job', 'title company')
      .populate('created_by', 'name email');

    if (!form) {
      return errorResponse(res, 404, 'Application form not found');
    }

    return successResponse(res, 200, 'Application form retrieved', form);

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete application form
 * @route   DELETE /api/application-forms/:id
 * @access  Private/Admin
 */
exports.deleteForm = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 400, 'Invalid form ID');
    }

    const form = await JobField.findById(id);

    if (!form) {
      return errorResponse(res, 404, 'Application form not found');
    }

    // Soft delete
    form.is_active = false;
    await form.save();

    await createAuditLog({
      user: req.user._id,
      action: 'FORM_DELETED',
      resource: 'JobField',
      resourceId: form._id,
      ipAddress: req.auditMetadata?.ipAddress,
      userAgent: req.auditMetadata?.userAgent,
      details: {
        formTitle: form.title
      },
      severity: 'medium'
    });

    return successResponse(res, 200, 'Application form deleted successfully');

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Duplicate form from another job
 * @route   POST /api/application-forms/duplicate/:formId
 * @access  Private/Admin
 */
exports.duplicateForm = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { job } = req.body;

    if (!mongoose.Types.ObjectId.isValid(formId) || !mongoose.Types.ObjectId.isValid(job)) {
      return errorResponse(res, 400, 'Invalid form or job ID');
    }

    const sourceForm = await JobField.findById(formId);
    if (!sourceForm) {
      return errorResponse(res, 404, 'Source form not found');
    }

    const targetJob = await Job.findById(job);
    if (!targetJob) {
      return errorResponse(res, 404, 'Target job not found');
    }

    // Check if target job already has a form
    const existingForm = await JobField.findOne({ job });
    if (existingForm) {
      return errorResponse(res, 400, 'Target job already has an application form');
    }

    // Create duplicate
    const newForm = await JobField.create({
      job,
      title: `Application for ${targetJob.title}`,
      description: sourceForm.description,
      sections: sourceForm.sections,
      settings: sourceForm.settings,
      created_by: req.user._id
    });

    return successResponse(res, 201, 'Form duplicated successfully', newForm);

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get form templates (pre-defined forms)
 * @route   GET /api/application-forms/templates
 * @access  Private/Admin
 */
exports.getFormTemplates = async (req, res, next) => {
  try {
    const templates = [
      {
        name: 'Backend Developer',
        description: 'Standard form for backend engineering positions',
        sections: [
          {
            section_id: 'technical',
            section_title: 'Technical Expertise',
            section_description: 'Tell us about your technical background',
            order: 1,
            questions: [
              {
                question_id: 'years_exp',
                question_text: 'Total years of backend development experience',
                question_type: 'radio',
                options: [
                  { label: '1-3 Years', value: '1-3' },
                  { label: '3-5 Years', value: '3-5' },
                  { label: '5-7 Years', value: '5-7' },
                  { label: '7+ Years', value: '7+' }
                ],
                validation: { required: true },
                order: 1
              },
              {
                question_id: 'primary_languages',
                question_text: 'Primary backend technologies and years of experience per language',
                question_type: 'textarea',
                placeholder: 'e.g., Node.js (5 years), Python (3 years)',
                validation: { required: true, minLength: 10 },
                order: 2
              },
              {
                question_id: 'databases',
                question_text: 'Databases used (e.g., PostgreSQL, MongoDB)',
                question_type: 'text',
                validation: { required: true },
                order: 3
              },
              {
                question_id: 'frameworks',
                question_text: 'Frameworks used',
                question_type: 'multi_select',
                options: [
                  { label: 'NestJS', value: 'nestjs' },
                  { label: 'Express', value: 'express' },
                  { label: 'Spring Boot', value: 'spring' },
                  { label: 'Django', value: 'django' },
                  { label: 'FastAPI', value: 'fastapi' }
                ],
                validation: { required: true },
                order: 4
              },
              {
                question_id: 'microservices_exp',
                question_text: 'Experience designing and maintaining microservice-based architectures',
                question_type: 'radio',
                options: [
                  { label: 'Yes', value: 'yes' },
                  { label: 'No', value: 'no' }
                ],
                validation: { required: true },
                order: 5
              },
              {
                question_id: 'microservices_desc',
                question_text: 'If yes - Briefly describe',
                question_type: 'textarea',
                validation: { required: false },
                order: 6
              }
            ]
          },
          {
            section_id: 'experience',
            section_title: 'Experience & Fit',
            order: 2,
            questions: [
              {
                question_id: 'system_led',
                question_text: 'Briefly describe a backend system you led or architected',
                question_type: 'textarea',
                validation: { required: true, minLength: 50 },
                order: 1
              },
              {
                question_id: 'scalability_exp',
                question_text: 'Experience with system scalability & security?',
                question_type: 'radio',
                options: [
                  { label: 'Yes', value: 'yes' },
                  { label: 'No', value: 'no' }
                ],
                validation: { required: true },
                order: 2
              }
            ]
          },
          {
            section_id: 'availability',
            section_title: 'Availability',
            order: 3,
            questions: [
              {
                question_id: 'availability_fulltime',
                question_text: 'Availability to work full-time on-site',
                question_type: 'radio',
                options: [
                  { label: 'Yes', value: 'yes' },
                  { label: 'No', value: 'no' }
                ],
                validation: { required: true },
                order: 1
              },
              {
                question_id: 'start_date',
                question_text: 'Earliest start date',
                question_type: 'date',
                validation: { required: true },
                order: 2
              }
            ]
          }
        ]
      },
      {
        name: 'Marketing Manager',
        description: 'Form for marketing positions',
        sections: [
          {
            section_id: 'experience',
            section_title: 'Marketing Experience',
            order: 1,
            questions: [
              {
                question_id: 'years_exp',
                question_text: 'Years of marketing experience',
                question_type: 'select',
                options: [
                  { label: '1-3 Years', value: '1-3' },
                  { label: '3-5 Years', value: '3-5' },
                  { label: '5+ Years', value: '5+' }
                ],
                validation: { required: true },
                order: 1
              },
              {
                question_id: 'channels',
                question_text: 'Which marketing channels have you worked with?',
                question_type: 'multi_select',
                options: [
                  { label: 'Social Media', value: 'social' },
                  { label: 'Email Marketing', value: 'email' },
                  { label: 'Content Marketing', value: 'content' },
                  { label: 'SEO/SEM', value: 'seo' },
                  { label: 'Paid Advertising', value: 'paid_ads' }
                ],
                validation: { required: true },
                order: 2
              },
              {
                question_id: 'portfolio',
                question_text: 'Link to your portfolio or previous campaigns',
                question_type: 'text',
                validation: { required: false },
                order: 3
              }
            ]
          }
        ]
      }
    ];

    return successResponse(res, 200, 'Form templates retrieved', templates);

  } catch (error) {
    next(error);
  }
};