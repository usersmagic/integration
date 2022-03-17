const mongoose = require('mongoose');
const validator = require('validator');

const Schema = mongoose.Schema;

const MAX_DATABASE_SHORT_TEXT_FIELD_LENGTH = 1e2;
const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const MAX_DATABASE_NUMERIC_FIELD_LENGTH = 1e6;
const MAX_PRODUCT_LIMIT_BY_COMPANY = 10;

const ProductSchema = new Schema({
  company_id: {
    type: mongoose.Types.ObjectId,
    required: true
  },
  name: {
    type: String,
    required: true,
    maxlength: MAX_DATABASE_SHORT_TEXT_FIELD_LENGTH
  },
  path: {
    type: String,
    required: true,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  }
});

ProductSchema.statics.findProductById = function (id, callback) {
  const Product = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Product.findById(mongoose.Types.ObjectId(id.toString()), (err, product) => {
    if (err) return callback('database_error');
    if (!product) return callback('document_not_found');

    return callback(null, product);
  });
};

module.exports = mongoose.model('Product', ProductSchema);
