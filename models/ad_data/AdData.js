const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const MAX_DATABASE_ARRAY_FIELD_LENGTH = 1e3;

const status_values = ['showed', 'closed', 'clicked'];

const Schema = mongoose.Schema;

const AdDataSchema = new Schema({
  ad_id: {
    type: mongoose.Types.ObjectId,
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

AdDataSchema.statics.findAdDataById = function (id, callback) {
  const AdData = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  AdData.findById(mongoose.Types.ObjectId(id.toString()), (err, ad_data) => {
    if (err) return callback('database_error');
    if (!ad_data) return callback('document_not_found');

    return callback(null, ad_data);
  });
};

AdDataSchema.statics.findOneAdDataByFilters = function (data, callback) {
  const AdData = this;
  const filters = {};

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (data.ad_id && validator.isMongoId(data.ad_id.toString()))
    filters.ad_id = mongoose.Types.ObjectId(data.ad_id.toString());

  if (data.status && typeof data.status == 'string' && status_values.includes(data.status))
    filters.status = data.status;

  if (data.status && Array.isArray(data.status) && !data.status.find(each => !status_values.includes(each)))
    filters.status = { $in: data.status };

  if (data.person_id && validator.isMongoId(data.person_id.toString()))
    filters.person_id_list = data.person_id.toString();

  AdData.findOne(filters, (err, ad_data) => {
    if (err) return callback('database_error');
    if (!ad_data) return callback('document_not_found');

    return callback(null, ad_data);
  });
};

AdDataSchema.statics.createAdData = function (data, callback) {
  const AdData = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.ad_id || !validator.isMongoId(data.ad_id.toString()))
    return callback('bad_request');
  
  if (!data.status || !status_values.includes(data.status))
    return callback('bad_request');

  const newAdDataData = {
    ad_id: mongoose.Types.ObjectId(data.ad_id.toString()),
    status: data.status
  };

  const newAdData = new AdData(newAdDataData);

  newAdData.save((err, ad_data) => {
    if (err) return callback('database_error');

    return callback(null, ad_data._id.toString());
  });
};

AdDataSchema.statics.pushPersonToAdData = function (data, callback) {
  const AdData = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.ad_id || !validator.isMongoId(data.ad_id.toString()))
    return callback('bad_request');

  if (!data.status || !status_values.includes(data.status))
    return callback('bad_request');

  if (!data.person_id || !validator.isMongoId(data.person_id.toString()))
    return callback('bad_request');

  AdData.findOne({
    ad_id: mongoose.Types.ObjectId(data.ad_id.toString()),
    status: data.status,
    person_id_list: data.person_id.toString()
  }, (err, ad_data) => {
    if (err) return callback('database_error');
    if (ad_data) return callback(null);

    AdData.findOne({
      ad_id: mongoose.Types.ObjectId(data.ad_id.toString()),
      status: data.status,
      person_id_list_length: { $lt: MAX_DATABASE_ARRAY_FIELD_LENGTH }
    }, (err, ad_data) => {
      if (err) return callback('database_error');
  
      if (ad_data) {
        AdData.findByIdAndUpdate(ad_data._id, {
          $push: { person_id_list: data.person_id.toString() },
          $inc: { person_id_list_length: 1 }
        }, err => {
          if (err) return callback('database_error');

          return callback(null);
        });
      } else {
        AdData.createAdData({
          ad_id: data.ad_id,
          status: data.status
        }, (err, id) => {
          if (err) return callback(err);

          AdData.findByIdAndUpdate(mongoose.Types.ObjectId(id), {
            $push: { person_id_list: data.person_id.toString() },
            $inc: { person_id_list_length: 1 }
          }, err => {
            if (err) return callback('database_error');
  
            return callback(null);
          });
        });
      };
    });
  });
};

AdDataSchema.statics.pullPersonFromAdData = function (data, callback) {
  const AdData = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');

  if (!data.ad_id || !validator.isMongoId(data.ad_id.toString()))
    return callback('bad_request');

  if (!data.person_id || !validator.isMongoId(data.person_id.toString()))
    return callback('bad_request');

  AdData.findOne({
    ad_id: mongoose.Types.ObjectId(data.ad_id.toString()),
    person_id_list: data.person_id.toString()
  }, (err, ad_data) => {
    if (err) return callback('database_error');
    if (!ad_data) return callback(null);

    AdData.findByIdAndUpdate(ad_data._id, {
      $pull: { person_id_list: data.person_id.toString() },
      $inc: { person_id_list_length: -1 }
    }, err => {
      if (err) return callback('database_error');

      return callback(null);
    });
  });
};

module.exports = mongoose.model('AdData', AdDataSchema);
