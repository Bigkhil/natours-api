const mongoose = require('mongoose');

const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/config.env` }); // add the environment variables from config.env file to process.env

process.on('uncaughtException', (err) => {
  // this function is used to catch any error with synchronous code and crash the app
  console.log(
    `Error name: ${err.name}\nError message: ${err.message.toString().split('\n')[0]}`,
  );
  // split will return an array of strings which were splitted on '\n' character
  console.log('UNHANDLED EXCEPTION !!!! SHUTTING DOWN......');
  process.exit(1);
});
const database = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(database, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('CONNECTED TO THE DATABASE SUCCESSFULLY');
  });

const app = require('./app');

const portnumber = process.env.PORT || 8000;
const server = app.listen(portnumber, () => {
  console.log(`listening on port ${portnumber}`);
});

process.on('unhandledRejection', (err) => {
  // this function catches any errors with asynchronous code using the event listener
  console.log(
    `Error name: ${err.name}\nError message: ${err.message.toString().split('\n')[0]}`,
  );
  // split will return an array of strings which were splitted on '\n' character
  console.log('UNHANDLED REJECTION !!!! SHUTTING DOWN......');
  server.close(() => {
    // server.close() is used to handle first any pending requests then crash the app using process.exit(1)
    process.exit(1);
  });
});
