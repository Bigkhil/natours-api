const user = require('../models/usermodel');
const AppError = require('../utils/appError');
const User = require('../models/usermodel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const newobj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newobj[el] = obj[el];
  });
  return newobj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user posts data about password
  if (req.body.password || req.body.passwordConfirm)
    return next(
      new AppError(
        'This route is not for password data, Please use /updateMyPassword.',
        400, // 400 -> bad request
      ),
    );

  // 2) filter out unwanted fields that are not supposed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email'); // here user can only update name and email

  // 3) Update user Document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, // to return the new updated user
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// eslint-disable-next-line no-unused-vars
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    // 204 -> deleted
    status: 'success',
    data: null,
  });
});

exports.createuser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'route is not avaialable use signup instead!',
  });
};

exports.getallusers = factory.getAll(user);

exports.getuser = factory.getOne(user);

// DON'T UPDATE PASSWORDS WITH THIS CONTROLLER!!
exports.updateuser = factory.updateOne(user);
// this deleteuser controller is only for admins
exports.deleteuser = factory.deleteOne(user);
