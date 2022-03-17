const mongoose = require('mongoose');
const validator = require('validator');

const Schema = mongoose.Schema;

const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;

const IntegrationPathSchema = new Schema({
  signature: {
    type: String,
    required: true,
    unique: true
    // Format: company_id + name.toLocaleLowerCase().trim().split(' ').join('_')
  },
  company_id: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    minlength: 0,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  path: {
    type: String,
    required: true,
    minlength: 0,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  product_id: {
    type: mongoose.Types.ObjectId,
    default: null,
    unique: true,
    sparse: true
  }
});

IntegrationPathSchema.statics.findIntegrationPathById = function (id, callback) {
  const IntegrationPath = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  IntegrationPath.findById(mongoose.Types.ObjectId(id.toString()), (err, integration_path) => {
    if (err) return callback('database_error');
    if (!integration_path) return callback('document_not_found');

    return callback(null, integration_path);
  });
};

IntegrationPathSchema.statics.findIntegrationPathSortedByCompanyId = function (company_id, callback) {
  const IntegrationPath = this;

  if (!company_id || !validator.isMongoId(company_id.toString()))
    return callback('bad_request');
  
  IntegrationPath
    .find({
      company_id: mongoose.Types.ObjectId(company_id.toString())
    })
    .sort({ name: 1 })
    .then(integration_paths => callback(null, integration_paths))
    .catch(err => callback('database_error'));
};

module.exports = mongoose.model('IntegrationPath', IntegrationPathSchema);
