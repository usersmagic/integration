const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const Company = require('../company/Company');
const IntegrationPath = require('../integration_path/IntegrationPath');
const Product = require('../product/Product');
const Template = require('../template/Template');

const getQuestion = require('./functions/getQuestion');

const DUPLICATED_UNIQUE_FIELD_ERROR_CODE = 11000;
const MAX_QUESTION_NUMBER_PER_COMPANY = 20;
const QUESTION_CREATED_AT_LENGTH = 10;

const Schema = mongoose.Schema;

const QuestionSchema = new Schema({
  signature: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  template_id: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  company_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    index: true
  },
  product_id: {
    type: mongoose.Types.ObjectId,
    default: null
  },
  order_number: {
    type: Number,
    required: true,
    index: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  integration_path_id_list: {
    type: Array,
    default: []
  },
  created_at: {
    type: String,
    required: true,
    length: QUESTION_CREATED_AT_LENGTH
  }
});

QuestionSchema.statics.findQuestionById = function (id, callback) {
  const Question = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Question.findById(mongoose.Types.ObjectId(id.toString()), (err, question) => {
    if (err) return callback('database_error');
    if (!question) return callback('document_not_found');

    return callback(null, question);
  });
};

QuestionSchema.statics.findQuestionByIdAndFormat = function (id, callback) {
  const Question = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Question.findById(mongoose.Types.ObjectId(id.toString()), (err, question) => {
    if (err) return callback('database_error');
    if (!question) return callback('document_not_found');

    getQuestion(question, (err, question) => {
      if (err) return callback(err);

      return callback(null, question);
    });
  });
};

QuestionSchema.statics.findQuestionsByFiltersAndSorted = function (data, callback) {
  const Question = this;

  const filters = {};

  if (data.company_id && validator.isMongoId(data.company_id.toString()))
    filters.company_id = mongoose.Types.ObjectId(data.company_id.toString());

  if (data.product_id && validator.isMongoId(data.product_id.toString()))
    filters.product_id = mongoose.Types.ObjectId(data.product_id.toString());

  if (data.min_order_number && Number.isInteger(data.min_order_number))
    filters.order_number = { $gt: data.min_order_number };

  if ('is_active' in data)
    filters.is_active = data.is_active ? true : false;

  if (data.integration_path_id_list && Array.isArray(data.integration_path_id_list) && !data.integration_path_id_list.find(each => !validator.isMongoId(each.toString())))
    filters.$or = data.integration_path_id_list.map(each => {
      return { integration_path_id_list: each.toString() }
    });

  Question
    .find(filters)
    .sort({ order_number: -1 })
    .then(questions => callback(null, questions))
    .catch(err => callback('database_error'));
};

QuestionSchema.statics.findQuestionByIdAndUpdateIntegrationPathIdList = function (id, data, callback) {
  const Question = this;

  Question.findQuestionById(id, (err, question) => {
    if (err) return callback(err);

    if (!data || !data.integration_path_id_list || !Array.isArray(data.integration_path_id_list))
      return callback('bad_request');

    Company.findCompanyById(question.company_id, (err, company) => {
      if (err) return callback(err);

      async.timesSeries(
        data.integration_path_id_list.length,
        (time, next) => IntegrationPath.findIntegrationPathById(data.integration_path_id_list[time], (err, integration_path) => {
          if (err) return next(err);
          if (integration_path.company_id.toString() != company._id.toString())
            return next('not_authenticated_request');

          return next(null, integration_path._id.toString());
        }),
        (err, integration_path_id_list) => {
          if (err) return callback(err);

          if (question.product_id) {
            IntegrationPath.findIntegrationPathByProductId(question.product_id, (err, integration_path) => {
              if (err) return callback(err);

              if (!integration_path_id_list.includes(integration_path._id.toString()))
                integration_path_id_list.push(integration_path._id.toString());

              Question.findByIdAndUpdate(question._id, {$set: {
                integration_path_id_list
              }}, err => {
                if (err) return callback(err);
    
                return callback(null);
              });
            });
          } else {
            Question.findByIdAndUpdate(question._id, {$set: {
              integration_path_id_list
            }}, err => {
              if (err) return callback(err);
  
              return callback(null);
            });
          }
        }
      );
    });
  });
};

module.exports = mongoose.model('Question', QuestionSchema);
