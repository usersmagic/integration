const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const Answer = require('../answer/Answer');
const Company = require('../company/Company');
const Person = require('../person/Person');

const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const MAX_FILTER_COUNT_PER_TARGET_GROUP = 100;

const Schema = mongoose.Schema;

const TargetGroupSchema = new Schema({
  company_id: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  name: {
    type: String,
    minlength: 1,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH,
    unique: true,
    required: true
  },
  filters: {
    type: Array,
    default: [],
    maxlength: MAX_FILTER_COUNT_PER_TARGET_GROUP
  }
});

TargetGroupSchema.statics.findTargetGroupById = function (id, callback) {
  const TargetGroup = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  TargetGroup.findById(mongoose.Types.ObjectId(id.toString()), (err, target_group) => {
    if (err) return callback('database_error');
    if (!target_group) return callback('document_not_found');

    return callback(null, target_group);
  });
};

TargetGroupSchema.statics.findTargetGroupByIdAndCheckIfPersonCanSee = function (data, callback) {
  const TargetGroup = this;

  TargetGroup.findTargetGroupById(data.target_group_id, (err, target_group) => {
    if (err) return callback(err);

    Company.findCompanyById(data.company_id, (err, company) => {
      if (err) return callback(err);
      if (target_group.company_id != company._id)
        return callback('not_authenticated_request');

      Person.findPersonById(data.person_id, (err, person) => {
        if (err) return callback(err);

        async.timesSeries(
          target_group.filters.length,
          (time, next) => {
            const filter = filters[time];
  
            Answer.findOneAnswer({
              template_id: filter.template_id,
              answer_given_to_template: filter.allowed_answers,
              person_id: person._id
            }, err => {
              if (err && err == 'document_not_found') return next('process_complete');
              if (err) return next(err);
              
              return next(null);
            });
          },
          err => {
            if (err && err == 'process_complete') return callback(null, false);
            if (err) return callback(err);
  
            return callback(null, true);
          }
        );
      });
    });
  });
};

module.exports = mongoose.model('TargetGroup', TargetGroupSchema);
