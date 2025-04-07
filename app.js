// requirements
const morgan = require('morgan');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalerrorhandler = require('./controllers/errorController');
const tourrouter = require('./routes/toursroutes');
const userrouter = require('./routes/userroutes');
const reviewrouter = require('./routes/reviewroutes');

const app = express();

// Global middle-wares

// Serving static files
app.use(express.static(path.join(__dirname, 'public'))); // if the route wasn't found in the routes it will search here

// Set security HTTP headers
app.use(helmet());

// development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit requests from same ip
const limiter = rateLimit({
  max: 100, // this means 100 requests for the same ip, try to adapt this number to your application requirements
  windowMs: 60 * 60 * 1000, // this is the interval in which the 100 requests will be executed
  message: 'Too many requests from this ip, please try again in an hour!!',
});
app.use('/api', limiter); // this rate limit works only on the api route and all it's descendants

// Body parser
app.use(express.json({ limit: '10kb' })); // middleware to handle any json payload in the request and put it in req.body

// Cookie parser
app.use(cookieParser());

// this middleware is used to parse the encoded data sent from a form in the request body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// data sanitization for NOSQL injection {"email": {"$gt": ""}} if i used this query with any valid password i will be logged
app.use(mongoSanitize());

// data sanitization for XSS scripting
app.use(xss());

/*
prevent query string parameter pollution ?sort=price&sort=duration this is an error that can be a vulnerability
so hpp handles this by taking the last value only so in this case it will sort by duration only
*/
app.use(
  hpp({
    whitelist: [
      'ratingsAverage',
      'ratingsQuantity',
      'duration',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Test middleware
app.use((req, res, next) => {
  req.requesttime = new Date().toISOString();
  console.log(req.cookies);
  next();
});

app.use('/api/v1/tours', tourrouter);
app.use('/api/v1/users', userrouter);
app.use('/api/v1/reviews', reviewrouter);

app.all('*', (req, res, next) => {
  /*
  middleware to handle all faulty routes
  all >> to match all the http methods
  */
  next(new AppError(`Can't find ${req.originalUrl} on the server`, 404));
});

app.use(globalerrorhandler);

module.exports = app;
