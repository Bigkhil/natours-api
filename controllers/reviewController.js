/* eslint-disable no-unused-vars */
const catchasync = require('../utils/catchAsync');
const Review = require('../models/reviewmodel');
const factory = require('./handlerFactory');

exports.checkTourandUserids = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.createReview = factory.createOne(Review);

exports.getAllReviews = factory.getAll(Review);

exports.getReview = factory.getOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
