const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const getTemplate = require('./functions/getTemplate');

const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const DEFAULT_LANGUAGE_VALUE = 'en';

const Schema = mongoose.Schema;

const TemplateSchema = new Schema({
  timeout_duration_in_week: {
    type: Number,
    required: true
  },
  timeout_duration_in_week_by_choices: {
    type: Object,
    default: {}
  },
  order_number: {
    type: Number,
    required: true,
    index: true
  },
  language: {
    type: String,
    default: DEFAULT_LANGUAGE_VALUE
  },
  name: { // Escape character for product values: {}
    type: String,
    required: true,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  text: { // Escape character for product values: {}
    type: String,
    required: true,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  type: {
    type: String,
    required: true
  },
  subtype: {
    type: String,
    required: true
  },
  choices: {
    type: Array,
    default: []
  },
  min_value: {
    type: Number,
    default: null
  },
  max_value: { 
    type: Number,
    default: null
  },
  labels: {
    type: Object,
    default: {
      left: null,
      middle: null,
      right: null
    }
  }
});

TemplateSchema.statics.findTemplateById = function (id, callback) {
  const Template = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Template.findById(mongoose.Types.ObjectId(id.toString()), (err, template) => {
    if (err) return callback('database_error');
    if (!template) return callback('document_not_found');

    return callback(null, template);
  });
};

TemplateSchema.statics.findTemplateByIdAndFormat = function (id, callback) {
  const Template = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Template.findById(mongoose.Types.ObjectId(id.toString()), (err, template) => {
    if (err) return callback('database_error');
    if (!template) return callback('document_not_found');

    getTemplate(template, (err, template) => {
      if (err) return callback(err);

      return callback(null, template);
    });
  });
};

module.exports = mongoose.model('Template', TemplateSchema);
