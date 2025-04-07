const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/usermodel');
const catchasync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendemail = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    // id is the payload
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createandsendtoken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    /* 
    this option will mark the cookie as http only which means the browser can only save the cookie
    and send it to the server but it can't manipulate it
    */
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // in production cookie will be used only in https
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined; // to hide the password property from being shown in the response
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// eslint-disable-next-line no-unused-vars
exports.signup = catchasync(async (req, res, next) => {
  const newuser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordchangedat: req.body.passwordchangedat,
    role: req.body.role,
  });

  // create new json web token for the new user
  createandsendtoken(newuser, 201, res);
});

exports.login = catchasync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if the user wrote email and password
  if (!email || !password)
    return next(new AppError('Please write your email and password', 400)); // 400 -> bad request
  // 2) check if the user exists && the password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.checkpassword(password, user.password)))
    //checks if the user exists then check if the entered password is the same as the hashed one in the database
    return next(new AppError('Incorrect email or password'), 401); // 401 -> unauthorized
  // 3) if everything is ok send token to client
  createandsendtoken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httponly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchasync(async (req, res, next) => {
  // this middleware only verifies that the user is logged in by checking the token which he sent

  // 1) get the token and check if it starts with 'bearer'
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else {
    return next(
      new AppError(
        'You are not logged in!! Please log in to get access!!',
        401,
      ),
    );
  }
  // 2) verifying the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  /*
  the jwt.verify function is an async function that will return the decoded payload, but we deal with promises most of the time,
   so we will use promisify to make it return a promise and use await, also in the case of error the catchasync
   works with promises .
  */

  // 3) check if the user still exists
  // if the user has signed up and has been issued a token and then this user has been deleted then the user shouldn't get access
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError('The User belonging to this token no longer EXISTS', 401),
    );
  // 4) check if the user changed password after the token was issued
  /* 
  this is because changing password usually comes from a security concern as the old password might be compromised 
  so the old token must be invalidated so if someone else has the old token they should lose access
  */
  if (currentUser.changedPasswordAfterToken(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed password!! Please log in again!!',
        401,
      ),
    );
  }
  // send data from this middleware to the next one
  req.user = currentUser;

  // grant access to protected route
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  /*
  this middleware only checks if a user is logged in by checking the token
  which he sent and send this user to the frontend template
  */

  // 1) check if the user is logged in
  if (req.cookies.jwt) {
    try {
      // 2) verifying the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      /*
  the jwt.verify function is an async function that will return the decoded payload, but we deal with promises most of the time,
   so we will use promisify to make it return a promise and use await, also in the case of error the catchasync
   works with promises .
  */

      // 3) check if the user still exists
      // if the user has signed up and has been issued a token and then this user has been deleted then the user shouldn't get access
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();
      // 4) check if the user changed password after the token was issued
      /* 
  this is because changing password usually comes from a security concern as the old password might be compromised 
  so the old token must be invalidated so if someone else has the old token they should lose access
  */
      if (currentUser.changedPasswordAfterToken(decoded.iat)) {
        return next();
      }

      // Send the current user to the frontend templates
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// eslint-disable-next-line arrow-body-style
exports.restrictTo = (...roles) => {
  /*
  we used a wrapper function here to pass the parameter to the middleware,
  which couldn't be done normally because middlewares in express only accept certain params like req, res, next, err
  */
  return (req, res, next) => {
    // authorization middleware
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('you do not have access to perform this action', 403), // 403 -> forbidden
      );
    }
    next();
  };
};

exports.forgotPassword = catchasync(async (req, res, next) => {
  // 1) check if there is a user with this email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('there is no user with this email', 404)); // 404 -> not found
  }

  // 2) generate a password reset token for this user
  const resetToken = user.createpasswordresettoken();
  await user.save({ validateBeforeSave: false }); // to save the password reset token and the expiry date to the database
  // 3) send this token to the user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  // this resetURL will be sent to the user's email in order to change his password using it

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\n
  If you didn't forget your password, please ignore this email!`;

  /*here we used try catch block as if there is an error we don't only want to send a message 
  but we want to remove the passwordResetToken and passwordResetExpires from the data base*/
  try {
    await sendemail({
      email: req.body.email,
      subject: 'Your password reset token (valid for 10 mins only)!',
      message,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email!! Please try again later!!',
      ),
      500, // 500 -> Internal Server Error
    );
  }
});

exports.resetPassword = catchasync(async (req, res, next) => {
  // 1) Get the user by the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // passwordResetExpires to be greater than the current time which means valid time
  });

  // 2) If token hasn't expired and the user exists, set the new password
  if (!user) return next(new AppError('Token is invalid or has expired', 400)); // 400 -> bad request
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 3) Update passwordchangedat property for the user

  /* after await user.save() resolves the middleware which changes the passwordchangedat property will work
  , but writing to the database takes time so the token will be issued faster than writing the property
  and this will result in that it will seem that the password is changed after the token was issued which is not true
  and might cause that the user can't access protected routes although he has just signed in, that's why in the middleware
  we subtract 1 sec from the password changed at property
  */

  // 4) log the user in by sending the JWT
  createandsendtoken(user, 200, res);
});

exports.updatePassword = catchasync(async (req, res, next) => {
  // 1) Get user from the collection
  const user = await User.findById(req.user.id).select('+password');
  // +password is added as it's defined in the schema that the password isn't included when the model is loaded
  // 2) check if posted password is correct
  if (!(await user.checkpassword(req.body.currentpassword, user.password)))
    return next(new AppError('incorrect password'), 401); // 401 -> unauthorized
  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 4) Log user in, send JWT
  createandsendtoken(user, 200, res);
});
