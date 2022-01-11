const mongoose = require('mongoose');
const validator = require('validator');

const Company = require('../company/Company');
const Person = require('../person/Person');
const TargetGroup = require('../target_group/TargetGroup');

const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const MAX_DATABASE_SHORT_TEXT_FIELD_LENGTH = 150;

const Schema = mongoose.Schema;

const AdSchema = new Schema({
  company_id: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  order_number: {
    type: Number,
    required: true,
    index: true
  },
  name: {
    type: String,
    minlength: 0,
    maxlenght: MAX_DATABASE_TEXT_FIELD_LENGTH,
    required: true
  },
  title: {
    type: String,
    minlength: 0,
    maxlenght: MAX_DATABASE_SHORT_TEXT_FIELD_LENGTH,
    required: true
  },
  text: {
    type: String,
    minlength: 0,
    maxlenght: MAX_DATABASE_SHORT_TEXT_FIELD_LENGTH,
    required: true
  },
  button_text: {
    type: String,
    minlength: 0,
    maxlenght: MAX_DATABASE_SHORT_TEXT_FIELD_LENGTH,
    required: true
  },
  button_url: {
    type: String,
    minlength: 0,
    maxlenght: MAX_DATABASE_TEXT_FIELD_LENGTH,
    required: true
  },
  image_url: {
    type: String,
    minlength: 0,
    maxlenght: MAX_DATABASE_TEXT_FIELD_LENGTH,
    required: true
  },
  target_group_id: {
    type: mongoose.Types.ObjectId,
    required: true
  }
});

AdSchema.statics.findAdById = function (id, callback) {
  const Ad = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Ad.findById(mongoose.Types.ObjectId(id.toString()), (err, ad) => {
    if (err) return callback('database_error');
    if (!ad) return callback('document_not_found');

    return callback(null, ad);
  });
};

AdSchema.statics.findAdsByCompanyId = function (company_id, callback) {
  const Ad = this;

  Company.findCompanyById(company_id, (err, company) => {
    if (err) return callback(err);

    Ad
      .find({
        company_id: company._id
      })
      .sort({ order_number: 1 })
      .then(ads => callback(null, ads))
      .catch(err => callback('database_error'));
  });
};

AdSchema.statics.findAdByIdAndCheckIfPersonCanSee = function (data, callback) {
  const Ad = this;

  Ad.findAdById(data.ad_id, (err, ad) => {
    if (err) return callback(err);

    Company.findCompanyById(data.company_id, (err, company) => {
      if (err) return callback(err);
      if (ad.company_id != company._id)
        return callback('not_authenticated_request');

      Person.findPersonById(data.person_id, (err, person) => {
        if (err) return callback(err);

        TargetGroup.findTargetGroupByIdAndCheckIfPersonCanSee({
          company_id: company._id,
          target_group_id: ad.target_group_id,
          person_id: person._id
        }, (err, res) => {
          if (err) return callback(err);

          return callback(null, res);
        });
      });
    });
  });
};

module.exports = mongoose.model('Ad', AdSchema);
