const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const getDay = require('../../utils/getDay');

const Company = require('../company/Company');
const IntegrationPath = require('../integration_path/IntegrationPath');

const MAX_DATABASE_ARRAY_FIELD_LENGTH = 1e3;

const status_values = ['showed', 'closed', 'email', 'question', 'ad'];
/*
  showed: openned banner, nothing else happened
  closed: clicked close immediately
  email: gave email, then closed
  question: answered some questions, did not see a banner
  ad: seen an ad
*/

const Schema = mongoose.Schema;

const AnalyticsSchema = new Schema({
  company_id: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  integration_path_id: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  day_data_is_from_in_unix_time: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  person_id_list: {
    type: Array,
    default: [],
    maxlength: MAX_DATABASE_ARRAY_FIELD_LENGTH
  },
  person_id_list_length: {
    type: Number,
    default: 0
  }
});

AnalyticsSchema.statics.findAnalyticsById = function (id, callback) {
  const Analytics = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Analytics.findById(mongoose.Types.ObjectId(id.toString()), (err, analytics) => {
    if (err) return callback('database_error');
    if (!analytics) return callback('document_not_found');

    return callback(null, analytics);
  });
};

AnalyticsSchema.statics.findOneAnalyticsByFilters = function (data, callback) {
  const Analytics = this;
  const filters = {};

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (data.integration_path_id && validator.isMongoId(data.integration_path_id.toString()))
    filters.integration_path_id = mongoose.Types.ObjectId(data.integration_path_id.toString());

  if (data.day_data_is_from_in_unix_time && Number.isInteger(data.day_data_is_from_in_unix_time))
    filters.day_data_is_from_in_unix_time = data.day_data_is_from_in_unix_time;

  if (data.status && typeof data.status == 'string' && status_values.includes(data.status))
    filters.status = data.status;

  if (data.status && Array.isArray(data.status) && !data.status.find(each => !status_values.includes(each)))
    filters.status = { $in: data.status };

  if (data.person_id && validator.isMongoId(data.person_id.toString()))
    filters.person_id_list = data.person_id.toString();

  if (data.person_id_list_not_full)
    filters.person_id_list_length = { $lt: MAX_DATABASE_ARRAY_FIELD_LENGTH };

  Analytics.findOne(filters, (err, analytics) => {
    if (err) return callback('database_error');
    if (!analytics) return callback('document_not_found');

    return callback(null, analytics);
  });
};

AnalyticsSchema.statics.createAnalytics = function (data, callback) {
  const Analytics = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');
  
  if (!data.status || !status_values.includes(data.status))
    return callback('bad_request');

  Company.findCompanyById(data.company_id, (err, company) => {
    if (err) return callback(err);

    IntegrationPath.findIntegrationPathById(data.integration_path_id, (err, integration_path) => {
      if (err) return callback(err);

      if (integration_path.company_id.toString() != company._id.toString())
        return callback('not_authenticated_request');

      getDay(0, (err, today) => {
        if (err) return callback(err);

        const newAnalyticsData = {
          company_id: mongoose.Types.ObjectId(data.company_id.toString()),
          integration_path_id: mongoose.Types.ObjectId(data.integration_path_id.toString()),
          day_data_is_from_in_unix_time: today,
          status: data.status
        };
  
        const newAnalytics = new Analytics(newAnalyticsData);
  
        newAnalytics.save((err, analytics) => {
          if (err) return callback('database_error');
  
          return callback(null, analytics._id.toString());
        });
      });
    });
  });
};

AnalyticsSchema.statics.findAnalyticsByIdAndPushPersonId = function (id, person_id, callback) {
  const Analytics = this;

  Analytics.findAnalyticsById(id, (err, analytics) => {
    if (err) return callback(err);

    if (analytics.person_id_list_length >= MAX_DATABASE_ARRAY_FIELD_LENGTH)
      return callback('bad_request');

    Analytics.findByIdAndUpdate(analytics._id, {
      $push: {
        person_id_list: person_id.toString()
      },
      $inc: {
        person_id_list_length: 1
      }
    }, err => {
      if (err) return callback('database_error');

      return callback(null);
    });
  });
};

AnalyticsSchema.statics.findAnalyticsByIdAndPullPersonId = function (id, person_id, callback) {
  const Analytics = this;

  Analytics.findAnalyticsById(id, (err, analytics) => {
    if (err) return callback(err);

    if (!analytics.person_id_list.includes(person_id.toString()))
      return callback(null);

    Analytics.findByIdAndUpdate(analytics._id, {
      $pull: {
        person_id_list: person_id.toString()
      },
      $inc: {
        person_id_list_length: -1
      }
    }, err => {
      if (err) return callback('database_error');

      return callback(null);
    });
  });
};

module.exports = mongoose.model('Analytics', AnalyticsSchema);
