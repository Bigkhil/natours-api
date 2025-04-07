class AppError extends Error {
  constructor(message, statuscode) {
    super(message); // this.message = message
    this.statuscode = statuscode;
    this.status = `${statuscode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
    /*
    this function adds the stack trace of the error to {this} object
    and exclude the constructor function from this trace in order not to pollute the trace
    */
  }
}

module.exports = AppError;
