/* eslint-disable arrow-body-style */
module.exports = (fn) => {
  /*
    this function will get called every time the file (controller file) is imported,
    and fn will contain the handler for the route, then this
    function will return an anonymous function which will be assigned
    to a variable in the controller file, then this variable will be called
    whenever it's own route is called executing the fn fuction which already contain the handler.
    We do all this to avoid repeating the try {} catch (err) {} blocks inside each controller function
  */
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err));
  };
};
