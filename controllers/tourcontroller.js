/* eslint-disable no-unused-vars */
const tour = require('../models/tourmodel');

const AppError = require('../utils/appError');
const catchasync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.topcheap = (req, res, next) => {
  // midlle-ware for the top-5-cheap alias route to pre-fill the request object for the user
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  next();
};

exports.createtour = factory.createOne(tour);

exports.getalltours = factory.getAll(tour);

exports.gettour = factory.getOne(tour, { path: 'reviews' });

exports.updatetour = factory.updateOne(tour);

exports.deletetour = factory.deleteOne(tour);

exports.gettourstats = catchasync(async (req, res, next) => {
  const stats = await tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minprice: { $min: '$price' },
        maxprice: { $max: '$price' },
      },
    },
    {
      $sort: { numTours: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getmonthlyplan = catchasync(async (req, res, next) => {
  const year = req.params.year * 1; //2021
  const plan = await tour.aggregate([
    {
      $unwind: '$startDates', // this aggregate stage deconstructs the list of [startDates] and put treat each element in a single document
    },
    {
      $match: {
        // matches the tours from the same year
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // the $month operator gets the month only from the startDates
        tourcounts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: { tourcounts: -1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
exports.getToursWithin = catchasync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  }
  console.log(radius);
  const tours = await tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: tours,
  });
});

exports.getDistances = catchasync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  }
  const distances = await tour.aggregate([
    {
      $geoNear: {
        // "near" is the point from which the distance will be calculated
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        // "distanceField" is the name of the field that will appear in the document
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: distances,
  });
});
