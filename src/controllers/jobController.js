const Job = require('../models/Job');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const createJob = async (req, res, next) => {
  try {
    const jobData = {
      ...req.body,
      postedBy: req.user.id
    };

    const job = await Job.create(jobData);
    
    return successResponse(res, 201, 'Job created successfully', job);
  } catch (error) {
    next(error);
  }
};

const getJobs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, location, status = 'active', search } = req.query;

    const query = { status };

    if (type) query.type = type;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const jobs = await Job.find(query)
      .populate('postedBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Job.countDocuments(query);

    return successResponse(res, 200, 'Jobs retrieved successfully', {
      jobs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalJobs: count
    });
  } catch (error) {
    next(error);
  }
};

const getJobById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name email');

    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    return successResponse(res, 200, 'Job retrieved successfully', job);
  } catch (error) {
    next(error);
  }
};

const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    return successResponse(res, 200, 'Job updated successfully', job);
  } catch (error) {
    next(error);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    return successResponse(res, 200, 'Job deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob
};