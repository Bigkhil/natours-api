/* eslint-disable no-unused-vars */
const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400); // 400 -> bad request
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.keyValue.name;
  const message = `Duplicate field value: ${value} , Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  /*
  Object.values(err.errors) >> this function will return an array
  of all the values of the keys ("name" key) in err.errors object
   */
  const message = `Invalid Input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token!! Please log in again!', 401); // 401 -> unauthorized

const handleJWTExpiredError = () =>
  new AppError('Your token has expired!! Please log in again!!', 401);

const senderrdev = (err, req, res) => {
  // this error will appear when there is an error only in the api other errors should be fixed on the frontend
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statuscode).json({
      status: err.status,
      message: err.message,
      err,
      stack: err.stack,
    });
  }
};
const senderrprod = (err, req, res) => {
  // error related to the api not the frontend
  if (req.originalUrl.startsWith('/api')) {
    // if the error is operational means that it's not related to a bug in the code
    if (err.isOperational) {
      res.status(err.statuscode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // error related to a bug in the code

      // 1) log the error in the console to examine it
      console.error('ERROR!!!!', err);
      // 2) send a message to the user indicating it's an internal server error
      res.status(500).json({
        // 500 -> internal server error
        status: 'error',
        message: 'something went wrong !!!',
      });
    }
  }
};
module.exports = (err, req, res, next) => {
  // this function is a global error handler middleware for all errors

  //   console.log(err.stack);
  err.statuscode = err.statuscode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    let error = { ...err };
    error.message = err.message;
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    senderrprod(error, req, res);
  } else {
    senderrdev(err, req, res);
  }
};
