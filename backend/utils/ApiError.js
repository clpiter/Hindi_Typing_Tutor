/** Error with an HTTP status that the global error middleware understands */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message)
    this.statusCode = statusCode
    this.details = details
  }

  static badRequest(msg, details) {
    return new ApiError(400, msg, details)
  }
  static unauthorized(msg = 'Not authenticated. Please log in.') {
    return new ApiError(401, msg)
  }
  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg)
  }
  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg)
  }
  static conflict(msg, details) {
    return new ApiError(409, msg, details)
  }
}

module.exports = ApiError
