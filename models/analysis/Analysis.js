const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const getDay = require('../../utils/getDay');

const Company = require('../company/Company');
const IntegrationPath = require('../integration_path/IntegrationPath');

const MAX_DATABASE_ARRAY_FIELD_LENGTH = 1e3;

const status_values = ['showed', 'closed', 'email', 'question'];

const Schema = mongoose.Schema;

const AnalysisSchema = new Schema({
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
  people_count: {
    type: Number,
    default: 0
  }
});

AnalysisSchema.statics.findAnalysisById = function (id, callback) {
  const Analysis = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Analysis.findById(mongoose.Types.ObjectId(id.toString()), (err, analysis) => {
    if (err) return callback('database_error');
    if (!analysis) return callback('document_not_found');

    return callback(null, analysis);
  });
};

AnalysisSchema.statics.findOneAnalysisByFilters = function (data, callback) {
  const Analysis = this;
  const filters = {};

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (data.analysis_id && validator.isMongoId(data.analysis_id.toString()))
    filters.analysis_id = mongoose.Types.ObjectId(data.analysis_id.toString());

  if (data.day_data_is_from_in_unix_time && Number.isInteger(data.day_data_is_from_in_unix_time))
    filters.day_data_is_from_in_unix_time = data.day_data_is_from_in_unix_time;

  if (data.status && typeof data.status == 'string' && status_values.includes(data.status))
    filters.status = data.status;

  if (data.status && Array.isArray(data.status) && !data.status.find(each => !status_values.includes(each)))
    filters.status = { $in: data.status };

  Analysis.findOne(filters, (err, analysis) => {
    if (err) return callback('database_error');
    if (!analysis) return callback('document_not_found');

    return callback(null, analysis);
  });
};

AnalysisSchema.statics.createAnalysis = function (data, callback) {
  const Analysis = this;

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

        const newAnalysisData = {
          company_id: mongoose.Types.ObjectId(data.company_id.toString()),
          integration_path_id: mongoose.Types.ObjectId(data.integration_path_id.toString()),
          day_data_is_from_in_unix_time: today,
          status: data.status
        };
  
        const newAnalysis = new Analysis(newAnalysisData);
  
        newAnalysis.save((err, analysis) => {
          if (err) return callback('database_error');
  
          return callback(null, analysis._id.toString());
        });
      });
    });
  });
};

AnalysisSchema.statics.incPeopleCountInAnalysis = function (data, callback) {
  const Analysis = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.company_id || !validator.isMongoId(data.company_id.toString()))
    return callback('bad_request');

  if (!data.integration_path_id || !validator.isMongoId(data.integration_path_id.toString()))
    return callback('bad_request');

  if (!data.status || !status_values.includes(data.status))
    return callback('bad_request');

  Analysis.findOne({
    company_id: mongoose.Types.ObjectId(data.company_id.toString()),
    integration_path_id: mongoose.Types.ObjectId(data.integration_path_id.toString()),
    status: data.status
  }, (err, analysis) => {
    if (err) return callback('database_error');

    if (analysis) {
      Analysis.findByIdAndUpdate(analysis._id, {$inc: {
        people_count: 1
      }}, err => {
        if (err) return callback('database_error');

        return callback(null);
      });
    } else {
      Analysis.createAnalysis(data, (err, id) => {
        if (err) return callback(err);

        Analysis.findByIdAndUpdate(mongoose.Types.ObjectId(id), {$inc: {
          people_count: 1
        }}, err => {
          if (err) return callback('database_error');
  
          return callback(null);
        });
      });
    }
  });
};

AnalysisSchema.statics.decPeopleCountInAnalysis = function (data, callback) {
  const Analysis = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.company_id || !validator.isMongoId(data.company_id.toString()))
    return callback('bad_request');

  if (!data.integration_path_id || !validator.isMongoId(data.integration_path_id.toString()))
    return callback('bad_request');

  if (!data.status || !status_values.includes(data.status))
    return callback('bad_request');

  Analysis.findOne({
    company_id: mongoose.Types.ObjectId(data.company_id.toString()),
    integration_path_id: mongoose.Types.ObjectId(data.integration_path_id.toString()),
    status: data.status
  }, (err, analysis) => {
    if (err) return callback('database_error');

    if (analysis) {
      Analysis.findByIdAndUpdate(analysis._id, {$inc: {
        people_count: -1
      }}, err => {
        if (err) return callback('database_error');

        return callback(null);
      });
    } else {
      Analysis.createAnalysis(data, (err, id) => {
        if (err) return callback(err);

        Analysis.findByIdAndUpdate(mongoose.Types.ObjectId(id), {$inc: {
          people_count: -1
        }}, err => {
          if (err) return callback('database_error');
  
          return callback(null);
        });
      });
    }
  });
};

module.exports = mongoose.model('Analysis', AnalysisSchema);
