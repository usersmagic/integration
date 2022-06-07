const express = require('express');
const router = express.Router();

const isConfirmedDomain = require('../middleware/isConfirmedDomain');

const indexPostController = require('../controllers/analytics/post');

router.post(
  '/',
    isConfirmedDomain,
    indexPostController
);

module.exports = router;
