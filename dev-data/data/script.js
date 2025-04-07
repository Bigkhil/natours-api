const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');
const tourmodel = require('../../models/tourmodel');
const usermodel = require('../../models/usermodel');
const reviewmodel = require('../../models/reviewmodel');

dotenv.config({ path: `${__dirname}/../../config.env` });

const database = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`));

mongoose
  .connect(database, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('CONNECTED TO THE DATABASE SUCCESSFULLY');
  });

const postdata = async () => {
  try {
    await tourmodel.create(tours);
    await usermodel.create(users, { validateBeforeSave: false });
    await reviewmodel.create(reviews);
  } catch (err) {
    console.log(err);
  }
};

const deletealldata = async () => {
  try {
    await tourmodel.deleteMany();
    await usermodel.deleteMany();
    await reviewmodel.deleteMany();
  } catch (err) {
    console.log(err);
  }
};

if (process.argv[2] === 'delete') {
  deletealldata();
  console.log('deleted');
}
if (process.argv[2] === 'post') {
  postdata();
  console.log('posted');
}
