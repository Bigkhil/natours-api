const express = require('express');

const ReviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

// mergeParams makes the parameters taken from other routes files accessible in this file like "tourId" in toursroutes
const Router = express.Router({ mergeParams: true });

// POST /tours/fdslkgjs5s5f4/reviews
// GET /tours/fdslkgjs5s5f4/reviews

Router.use(authController.protect);

Router.route('/')
  .get(ReviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    ReviewController.checkTourandUserids,
    ReviewController.createReview,
  );

Router.route('/:id')
  .get(ReviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    ReviewController.updateReview,
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    ReviewController.deleteReview,
  );

module.exports = Router;
