const express = require('express');
const tourcontroller = require('../controllers/tourcontroller');
const authcontroller = require('../controllers/authController');
const reviewRouter = require('./reviewroutes');

const Router = express.Router();

// Router.param('id', tourcontroller.checkid);

// the following line makes any request that hits this route to be redirected to the reviewRouter file
Router.use('/:tourId/reviews', reviewRouter);

// /tours-within/400/center/40,50/unit/mi
Router.get(
  '/tours-within/:distance/center/:latlng/unit/:unit',
  tourcontroller.getToursWithin,
);

// this route will get the distance to all the tours from the specific latlng point on the sphere
Router.get('/distances/:latlng/unit/:unit', tourcontroller.getDistances);

Router.route('/top-5-cheap').get(
  tourcontroller.topcheap, // this middle-ware will add some query strings in the request before handling it to the controller
  tourcontroller.getalltours,
);

Router.route('/get-stats').get(tourcontroller.gettourstats);
Router.route('/monthly-plan/:year').get(
  authcontroller.protect,
  authcontroller.restrictTo('admin', 'lead-guide', 'guide'),
  tourcontroller.getmonthlyplan,
); // 2021

Router.route('/')
  .get(tourcontroller.getalltours)
  .post(
    authcontroller.protect,
    authcontroller.restrictTo('admin', 'lead-guide'),
    tourcontroller.createtour,
  );
Router.route('/:id')
  .get(tourcontroller.gettour)
  .patch(
    authcontroller.protect,
    authcontroller.restrictTo('admin', 'lead-guide'),
    tourcontroller.updatetour,
  )
  .delete(
    authcontroller.protect,
    authcontroller.restrictTo('admin', 'lead-guide'), // this line will be replaced with the returned function from restrictTo
    tourcontroller.deletetour,
  );
module.exports = Router;
