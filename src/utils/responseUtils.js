const successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message: message
  };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message: message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = { successResponse, errorResponse };