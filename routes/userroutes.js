const express = require('express');

const usercontroller = require('../controllers/usercontroller');
const authcontroller = require('../controllers/authController');

const Router = express.Router();

Router.post('/signup', authcontroller.signup);
Router.post('/login', authcontroller.login);
Router.get('/logout', authcontroller.logout);
Router.post('/forgotPassword', authcontroller.forgotPassword);
Router.patch('/resetPassword/:token', authcontroller.resetPassword);

// this middleware protects all endpoints below it
Router.use(authcontroller.protect);

Router.patch('/updateMe', usercontroller.updateMe);

Router.patch('/updateMyPassword', authcontroller.updatePassword);
Router.delete('/deleteMyPassword', usercontroller.deleteMe);

Router.get('/me', usercontroller.getMe, usercontroller.getuser);

Router.use(authcontroller.restrictTo('admin'));

Router.route('/')
  .get(usercontroller.getallusers)
  .post(usercontroller.createuser);
Router.route('/:id')
  .get(usercontroller.getuser)
  .patch(usercontroller.updateuser)
  .delete(usercontroller.deleteuser);

module.exports = Router;
