class ApiFeature {
  constructor(query, querystring) {
    this.query = query;
    this.querystring = querystring;
  }

  filter() {
    const queryobject = JSON.parse(JSON.stringify(this.querystring)); // make shallow copy of the req.query
    // filtering
    const excludedquery = ['page', 'sort', 'limit', 'fields'];
    excludedquery.forEach((el) => delete queryobject[el]);
    // advanced filtering
    let querystr = JSON.stringify(queryobject);
    querystr = querystr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(querystr)); // tour.find({price: {$gte: 500}})
    return this; // return a new object of the class to be able to apply the new methods on it
  }

  sort() {
    // sorting
    if (this.querystring.sort) {
      const sortby = this.querystring.sort.split(',').join(' '); // this.querystring.sort = [prices,duration] in order to work with mongoose it should look like this[prices duration]
      this.query = this.query.sort(sortby);
    } else this.query = this.query.sort('_id'); // always avoid sorting with properties which may have simillar values as sorting may behave unpredictably
    return this;
  }

  limitfields() {
    // fields selection
    if (this.querystring.fields) {
      const fields = this.querystring.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    // pagination
    const page = this.querystring.page * 1 || 1;
    const limit = this.querystring.limit * 1 || 100;
    const skip = (page - 1) * limit;
    this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = ApiFeature;
