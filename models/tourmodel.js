const mongoose = require('mongoose');

const slugify = require('slugify'); // it's used to convert strings to fit in the urls format ' ' >> '-'

// const User = require('./usermodel');

// eslint-disable-next-line no-unused-vars
const validator = require('validator');

const tourschema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, "you can't exceed 40 characters in the name"],
      minlength: [10, "you can't make the name less than 10 characters"],
      // validate: [validator.isAlpha, 'your name should only contain letters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message:
          "the available difficulty values are 'easy','medium' and 'difficult'",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      // setter works each time there is a new value in this field
      set: (val) => Math.round(val * 10) / 10, // Math.round(4.6667 * 10 = 46.7) => 47 / 10 = 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this here only points to new documents from the post requests but it won't work with update
          return val < this.price;
        },
        message:
          'the price discount value should be less than the original price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], // list of strings where each string points to an image in the file system
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      // here we used a GeoJSON doc inside an array to embed the locations inside the tours model as an embedded model not referenced
      {
        //GeoJSON
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        // this way tours and tour-guides are different entities and the tours guides are referenced inside each tour
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

tourschema.virtual('durationWeeks').get(function () {
  /*
  -this virtual property won't be saved in the database, it will be calculated only when there is a get request
  -this property could have been added as a middle-ware in the controller but this would be inappropriate,
   as this property belongs to the business model so it should be in the model not in the controller
  */
  return this.duration / 7; // here this points to the document
});

// this is called a compound index which works for both properties together and independent
tourschema.index({ price: 1, ratingsAverage: -1 });
tourschema.index({ slug: 1 });
tourschema.index({ startLocation: '2dsphere' });

// this is virtual populate feature to show the review in each tour
tourschema.virtual('reviews', {
  ref: 'Review',
  // foreignField is the name of the field in the Review model that refers to the current tour model
  foreignField: 'tour',
  // localField in the name of the field in the current tour model that is referenced in the Review model
  localField: '_id',
});

// DOCUMENT MIDDLEWARES: pre() will be triggered only when .save() or .create() methods are called but not with .insertmany()
tourschema.pre('save', function (next) {
  // this is a middleware for pre-save-hook
  // hook >> 'save'
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourschema.pre('save', async function (next) {
//   // guidesPromises will be an array of promises as the callback function inside the map returns a promise because of async
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourschema.pre('save', function (next) {
//   this.slug += 'khalil';
//   next();
// });

// tourschema.post('save', (doc, next) => {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARES
tourschema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordchangedat',
  });
  next();
});

tourschema.pre(/^find/, function (next) {
  // this pre-find middleware is triggered with every .find() query
  this.start = Date.now(); // add start property to query object
  this.find({ secretTour: { $ne: true } });
  next();
});

tourschema.post(/^find/, function (docs, next) {
  /*
  this middleware will be triggerd after the .find() query finished
  will have access to {docs} which are objects returned from .find() query
  */
  console.log(`the query took ${Date.now() - this.start} milliseconds`);
  next();
});

// AGGREGATION MIDDLEWARES
// tourschema.pre('aggregate', function (next) {
//   // this middleware will specify that secret tours don't appear in the aggregate queries
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); // unshift pushes an element at the beginning of the array
//   next();
// });
const Tour = mongoose.model('Tour', tourschema);

module.exports = Tour;
