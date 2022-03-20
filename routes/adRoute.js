const express = require('express');
const router = express.Router();

const isConfirmedDomain = require('../middleware/isConfirmedDomain');

const indexGetController = require('../controllers/ad/index/get');

const statusPostController = require('../controllers/ad/status/post');

router.get(
  '/',
    isConfirmedDomain,
    indexGetController
);

router.post(
  '/status',
    isConfirmedDomain,
    statusPostController
);

module.exports = router;
