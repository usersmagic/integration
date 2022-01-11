const mongoose = require('mongoose');
const validator = require('validator');

const MAX_DATABASE_ARRAY_FIELD_LENGTH = 1e2;
const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const PREFERRED_LANGUAGE_LENGTH = 2;

const Schema = mongoose.Schema;

const CompanySchema = new Schema({
  name: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  country: {
    type: String,
    length: 2,
    default: null
  },
  is_on_waitlist: {
    type: Boolean,
    default: true
  },
  domain: {
    type: String,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH,
    default: null
  },
  waiting_domain: {
    type: String,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH,
    default: null
  },
  integration_routes: {
    type: Array,
    default: [],
    maxlength: MAX_DATABASE_ARRAY_FIELD_LENGTH
    // {
    //   _id: mongoose.Types.ObjectId(),
    //   name: String,
    //   route: String,
    //   is_active: Boolean
    // }
  },
  preferred_language: {
    type: String,
    default: 'en',
    length: PREFERRED_LANGUAGE_LENGTH
  },
  preferred_color: {
    type: String,
    default: '#2EC5CE',
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH,
    minlength: 1
  }
});

CompanySchema.statics.findCompanyById = function (id, callback) {
  const Company = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Company.findById(mongoose.Types.ObjectId(id.toString()), (err, company) => {
    if (err) return callback('database_error');
    if (!company) return callback('document_not_found');

    return callback(null, company);
  });
};

module.exports = mongoose.model('Company', CompanySchema);
