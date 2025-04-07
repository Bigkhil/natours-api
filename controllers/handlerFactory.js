/* eslint-disable no-unused-vars */
const AppError = require('../utils/appError');
const catchasync = require('../utils/catchAsync');
const ApiFeature = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchasync(async (req, res, next) => {
    const Modeltodelete = await Model.findByIdAndDelete(req.params.id);
    if (!Modeltodelete) {
      return next(new AppError('there is no Model with this id', 404));
    }
    res.status(204).json({
      status: 'success',
      message: 'deleted successfully',
    });
  });

exports.updateOne = (Model) =>
  catchasync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // return back the newly updated doc
      runValidators: true, // run the schema validators again on the updated properties
    });

    if (!doc) {
      return next(new AppError('there is no document with this id', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchasync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOtions) =>
  catchasync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOtions) query = query.populate(popOtions);
    const doc = await query;
    if (!doc) {
      return next(new AppError('there is no document with this id', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchasync(async (req, res, next) => {
    let filter = {};
    // check if there is a tourId in the parameters of the request to get only the reviews of this tour
    if (req.params.tourId) filter = { tour: req.params.tourId };
    // execute the query
    const features = new ApiFeature(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitfields()
      .paginate();
    const doc = await features.query;
    // send the response
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
