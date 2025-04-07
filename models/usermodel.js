const mongoose = require('mongoose');
const crypto = require('crypto');
const validator = require('validator');
const bcrypt = require('bcryptjs'); // midlleware to hash the user's password

const userschema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'a user must have a name'],
  },
  email: {
    type: String,
    required: [true, 'a user must have an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'please write a valid email'],
  },
  photo: String, // this string will point to a path in the file system
  role: {
    type: String,
    enum: ['user', 'admin', 'guide', 'lead-guide'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'a user must have a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'you must confirm your password'],
    validate: {
      // this will only work with user.save() and user.create() but it won't work with update
      validator: function (el) {
        // el -> the typed password in the passwordConfirm
        // this -> the current user object
        return el === this.password;
      },
      message: 'Passwords are not equal',
    },
  },
  passwordchangedat: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// instance methods

userschema.methods.checkpassword = async function (candidatepass, userpass) {
  // this is called instance method which is available for all documents of this certain collection
  return await bcrypt.compare(candidatepass, userpass);
};

userschema.methods.changedPasswordAfterToken = function (JWTissuedat) {
  if (this.passwordchangedat) {
    const changedpassat = parseInt(this.passwordchangedat.getTime() / 1000, 10);
    return changedpassat > JWTissuedat;
    /*
    this will return true if changedpassat is bigger than JWTissuedat which means that
    it will return true if the password has changed after the token was issued to the user
    */
  }

  // false means that the password has not changed after the token was issued
  return false;
};

userschema.methods.createpasswordresettoken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // this will generate random hexadecimal string

  this.passwordResetToken = crypto // this will generate the hashed password reset token
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // the reset password token expiry date is 10 min (in ms)
  // console.log({ resetToken }, this.passwordResetToken);
  return resetToken; // return the original token
};

// document middlewares

userschema.pre('save', async function (next) {
  // this middleware will only run when the password property is modified
  if (!this.isModified('password')) return next();

  // this will hash the password with salt length = 12
  this.password = await bcrypt.hash(this.password, 12);

  /*
  this line excludes the passwordConfirm property from being saved in the database
  as mongoose omits the properties which have {undefined} values,
  we did this as passwordConfirm property is no longer needed in the model it was only used in password validation,
  */
  this.passwordConfirm = undefined;
});

userschema.pre('save', function (next) {
  // this middleware will add the passwordchangedat property to the user each time he changes his password
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordchangedat = Date.now() - 1000;
  /* this 1 sec is added because the jwt is issued faster than saving to the database
  so it will appear that the user changed the password after he was issued the token which isn't true
  */
  next();
});

// Query middlewares

userschema.pre(/^find/, function (next) {
  // this query middleware is used whenever a user is queried using find where it won't get users wich are inactive
  this.find({ active: { $ne: false } });
  next();
});

const User = mongoose.model('User', userschema);
module.exports = User;
