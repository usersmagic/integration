const mongoose = require('mongoose');
const validator = require('validator');

const AdData = require('../ad_data/AdData');
const Company = require('../company/Company');
const TargetGroup = require('../target_group/TargetGroup');

const MAX_DATABASE_ARRAY_FIELD_LENGTH = 1e4;
const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const MAX_DATABASE_SHORT_TEXT_FIELD_LENGTH = 150;
const MAX_AD_COUNT_PER_COMPANY = 1e2;

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
  },
  integration_path_id_list: {
    type: Array,
    default: [],
    maxlength: MAX_DATABASE_ARRAY_FIELD_LENGTH
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: String,
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

AdSchema.statics.findAdsByFiltersAndSorted = function (data, callback) {
  const Ad = this;
  const filters = {};

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (data.company_id && validator.isMongoId(data.company_id.toString()))
    filters.company_id = mongoose.Types.ObjectId(data.company_id.toString());

  if ('is_active' in data)
    filters.is_active = data.is_active ? true : false;

  if (data.integration_path_id_list && Array.isArray(data.integration_path_id_list) && !data.integration_path_id_list.find(each => !validator.isMongoId(each.toString())))
    filters.$or = data.integration_path_id_list.map(each => {
      return { integration_path_id_list: each.toString() }
    });

  Ad.find(filters)
  .sort({ order_number: 1 })
  .then(ads => callback(null, ads))
  .catch(err => callback('database_error'));
};

AdSchema.statics.findAdByIdAndCheckIfPersonCanSee = function (data, callback) {
  const Ad = this;

  Ad.findAdById(data.ad_id, (err, ad) => {
    if (err) return callback(err);

    Company.findCompanyById(data.company_id, (err, company) => {
      if (err) return callback(err);
      if (ad.company_id.toString() != company._id.toString())
        return callback('not_authenticated_request');

      TargetGroup.findTargetGroupByIdAndCheckIfPersonCanSee({
        company_id: company._id,
        target_group_id: ad.target_group_id,
        person_id: data.person_id
      }, (err, res) => {
        if (err) return callback(err);
        if (!res) return callback(null, false);

        AdData.findOneAdDataByFilters({
          ad_id: ad._id,
          status: ['closed', 'clicked'],
          person_id: data.person_id
        }, (err, ad_data) => {
          if (err && err != 'document_not_found') return callback(err);
          if (!err && ad_data) return callback(null, false);

          return callback(null, true);
        });
      });
    });
  });
};

AdSchema.statics.findAdByIdAndUpdatePersonStatus = function (data, callback) {
  const Ad = this;

  Ad.findAdById(data.ad_id, (err, ad) => {
    if (err) return callback(err);

    AdData.pullPersonFromAdData({
      ad_id: ad._id,
      person_id: data.person_id
    }, err => {
      if (err) return callback(err);

      AdData.pushPersonToAdData({
        ad_id: ad._id,
        person_id: data.person_id,
        status: data.status
      }, err => {
        if (err) return callback(err);

        return callback(null);
      });
    });
  });
};

module.exports = mongoose.model('Ad', AdSchema);
