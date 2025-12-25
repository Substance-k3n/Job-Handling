const mongoose = require('mongoose');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * @desc    Move application to a different pipeline stage
 * @route   PATCH /api/applications/:id/move-stage
 * @access  Private (Admin only)
 */
exports.moveStage = async (req, res, next) => {
  try {
    const { stage, notes } = req.body;
    const applicationId = req.params.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return errorResponse(res, 400, 'Invalid application ID format');
    }

    // Find application and populate details
    const application = await Application.findById(applicationId)
      .populate('job', 'title status postedBy')
      .populate('applicant', 'name email');

    if (!application) {
      return errorResponse(res, 404, 'Application not found');
    }

    // Business rule: Cannot move stages on closed jobs (except to rejected)
    if (application.job.status === 'closed' && stage !== 'rejected') {
      return errorResponse(res, 400, 'Cannot move stages for applications on closed jobs');
    }

    // Prevent moving to the same stage
    if (application.pipeline_stage === stage) {
      return errorResponse(res, 400, `Application is already in ${stage} stage`);
    }

    // Validate stage transitions (business logic)
    const invalidTransitions = {
      'hired': ['rejected', 'screening', 'interview'],
      'rejected': ['hired', 'offer', 'assessment', 'interview', 'screening', 'applied']
    };

    if (invalidTransitions[application.pipeline_stage]?.includes(stage)) {
      return errorResponse(
        res, 
        400,
        `Invalid transition: Cannot move from ${application.pipeline_stage} to ${stage}`
      );
    }

    // Store previous stage for history
    const previousStage = application.pipeline_stage;

    // Update pipeline stage
    application.pipeline_stage = stage;
    application.current_stage_entered = new Date();
    
    // Add to stage history
    application.stage_history.push({
      stage,
      changed_by: req.user._id,
      changed_at: new Date(),
      notes: notes || `Moved from ${previousStage} to ${stage}`
    });

    await application.save();

    // Create audit log
    await createAuditLog({
      user: req.user._id,
      action: 'STAGE_CHANGED',
      resource: 'Application',
      resourceId: application._id,
      ipAddress: req.auditMetadata?.ipAddress,
      userAgent: req.auditMetadata?.userAgent,
      details: {
        jobTitle: application.job.title,
        applicantName: application.applicant.name,
        applicantEmail: application.applicant.email,
        fromStage: previousStage,
        toStage: stage,
        notes: notes || 'No notes provided'
      },
      severity: stage === 'rejected' ? 'medium' : 'low'
    });

    // TODO: Trigger email notification to candidate
    // await sendStageChangeEmail(application.applicant.email, stage, application.job.title);

    return successResponse(res, 200, `Application moved to ${stage} stage successfully`, {
      _id: application._id,
      job: application.job.title,
      applicant: application.applicant.name,
      previous_stage: previousStage,
      pipeline_stage: application.pipeline_stage,
      current_stage_entered: application.current_stage_entered,
      last_updated_by: req.user.name
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pipeline statistics for a job
 * @route   GET /api/jobs/:jobId/pipeline-stats
 * @access  Private (Admin only)
 */
exports.getPipelineStats = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return errorResponse(res, 400, 'Invalid job ID format');
    }

    // Verify job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Aggregate pipeline statistics
    const stats = await Application.aggregate([
      { $match: { job: new mongoose.Types.ObjectId(jobId) } },
      {
        $group: {
          _id: '$pipeline_stage',
          count: { $sum: 1 },
          averageTimeInStage: {
            $avg: {
              $subtract: [new Date(), '$current_stage_entered']
            }
          }
        }
      },
      {
        $project: {
          stage: '$_id',
          count: 1,
          averageTimeInDays: {
            $round: [{ $divide: ['$averageTimeInStage', 1000 * 60 * 60 * 24] }, 1]
          },
          _id: 0
        }
      }
    ]);

    // Format response with all stages (even if count is 0)
    const allStages = ['applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'];
    const formattedStats = allStages.map(stage => {
      const found = stats.find(s => s.stage === stage);
      return {
        stage,
        count: found ? found.count : 0,
        averageTimeInDays: found ? found.averageTimeInDays : 0
      };
    });

    const totalApplications = formattedStats.reduce((sum, s) => sum + s.count, 0);

    // Create audit log
    await createAuditLog({
      user: req.user._id,
      action: 'JOB_VIEWED',
      resource: 'Job',
      resourceId: job._id,
      ipAddress: req.auditMetadata?.ipAddress,
      userAgent: req.auditMetadata?.userAgent,
      details: {
        jobTitle: job.title,
        action: 'Viewed pipeline statistics'
      },
      severity: 'low'
    });

    return successResponse(res, 200, 'Pipeline statistics retrieved', {
      job: { _id: job._id, title: job.title },
      totalApplications,
      pipelineBreakdown: formattedStats
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get stage history for an application
 * @route   GET /api/applications/:id/stage-history
 * @access  Private (Admin or Applicant)
 */
exports.getStageHistory = async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return errorResponse(res, 400, 'Invalid application ID format');
    }

    const application = await Application.findById(applicationId)
      .populate('stage_history.changed_by', 'name email role')
      .populate('applicant', '_id')
      .select('stage_history pipeline_stage job applicant');

    if (!application) {
      return errorResponse(res, 404, 'Application not found');
    }

    // Authorization: Only admin or the applicant can view history
    const isOwner = req.user._id.toString() === application.applicant._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwner) {
      return errorResponse(res, 403, 'Not authorized to view this application history');
    }

    return successResponse(res, 200, 'Stage history retrieved', {
      currentStage: application.pipeline_stage,
      history: application.stage_history.sort((a, b) => b.changed_at - a.changed_at)
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all applications grouped by pipeline stage (Kanban board)
 * @route   GET /api/applications/pipeline
 * @access  Private (Admin only)
 */
exports.getKanbanBoard = async (req, res, next) => {
  try {
    const { jobId } = req.query;
    const query = {};

    if (jobId) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return errorResponse(res, 400, 'Invalid job ID format');
      }
      query.job = jobId;
    }

    const applications = await Application.find(query)
      .populate('job', 'title company')
      .populate('applicant', 'name email')
      .sort({ current_stage_entered: -1 })
      .lean();

    // Group by pipeline stage
    const kanbanBoard = {
      applied: [],
      screening: [],
      interview: [],
      assessment: [],
      offer: [],
      hired: [],
      rejected: []
    };

    applications.forEach(app => {
      if (kanbanBoard[app.pipeline_stage]) {
        kanbanBoard[app.pipeline_stage].push({
          _id: app._id,
          applicant: app.applicant,
          job: app.job,
          stage: app.pipeline_stage,
          timeInStage: Math.floor((new Date() - new Date(app.current_stage_entered)) / (1000 * 60 * 60 * 24)), // days
          appliedAt: app.createdAt
        });
      }
    });

    return successResponse(res, 200, 'Kanban board retrieved', kanbanBoard);

  } catch (error) {
    next(error);
  }
};