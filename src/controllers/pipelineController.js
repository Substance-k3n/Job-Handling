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

    // Validate ObjectId format first
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return errorResponse(res, 'Invalid application ID format', 400);
    }

    // Find application and populate job details
    const application = await Application.findById(applicationId)
      .populate('job', 'title status postedBy')
      .populate('applicant', 'name email');

    if (!application) {
      return errorResponse(res, 'Application not found', 404);
    }

    // Check if job is still active (optional business rule)
    if (application.job.status === 'closed' && stage !== 'rejected') {
      return errorResponse(res, 'Cannot move stages for applications on closed jobs', 400);
    }

    // Prevent moving to the same stage
    if (application.pipeline_stage === stage) {
      return errorResponse(res, `Application is already in ${stage} stage`, 400);
    }

    // Validate stage transitions (business rules)
    const invalidTransitions = {
      'hired': ['rejected'],
      'rejected': ['hired', 'offer', 'assessment', 'interview', 'screening']
    };

    if (invalidTransitions[application.pipeline_stage]?.includes(stage)) {
      return errorResponse(
        res, 
        `Cannot move from ${application.pipeline_stage} to ${stage}`, 
        400
      );
    }

    // Store previous stage for history
    const previousStage = application.pipeline_stage;

    // Update pipeline stage
    application.pipeline_stage = stage;
    application.current_stage_entered = new Date(); // Explicitly set timestamp
    
    // Add to stage history
    application.stage_history.push({
      stage,
      changed_by: req.user._id,
      changed_at: new Date(),
      notes: notes || `Moved from ${previousStage} to ${stage}`
    });

    await application.save();

    // Trigger Audit Log after successful update
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
        fromStage: previousStage,
        toStage: stage,
        notes: notes || 'No notes provided'
      },
      severity: stage === 'rejected' ? 'medium' : 'low'
    });

    // TODO: Trigger Notification to Applicant
    // await sendNotification({
    //   recipient: application.applicant._id,
    //   type: 'APPLICATION_STAGE_UPDATED',
    //   data: { jobTitle: application.job.title, newStage: stage }
    // });

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
      return errorResponse(res, 'Invalid job ID format', 400);
    }

    // Verify job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 'Job not found', 404);
    }

    // Aggregate pipeline statistics
    const stats = await Application.aggregate([
      { $match: { job: mongoose.Types.ObjectId(jobId) } },
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

    return successResponse(res, 200, 'Pipeline statistics retrieved', {
      job: { _id: job._id, title: job.title },
      totalApplications: formattedStats.reduce((sum, s) => sum + s.count, 0),
      pipelineBreakdown: formattedStats
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get stage history for an application
 * @route   GET /api/applications/:id/stage-history
 * @access  Private
 */
exports.getStageHistory = async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return errorResponse(res, 'Invalid application ID format', 400);
    }

    const application = await Application.findById(applicationId)
      .populate('stage_history.changed_by', 'name email role')
      .populate('applicant', '_id')
      .select('stage_history pipeline_stage job applicant');

    if (!application) {
      return errorResponse(res, 'Application not found', 404);
    }

    // Authorization: Only admin or the applicant can view history
    if (req.user.role !== 'admin' && req.user._id.toString() !== application.applicant._id.toString()) {
      return errorResponse(res, 'Not authorized to view this application history', 403);
    }

    return successResponse(res, 200, 'Stage history retrieved', {
      currentStage: application.pipeline_stage,
      history: application.stage_history.sort((a, b) => b.changed_at - a.changed_at)
    });

  } catch (error) {
    next(error);
  }
};