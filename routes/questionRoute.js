const express = require('express');
const router = express.Router();

const isConfirmedDomain = require('../middleware/isConfirmedDomain');

const checkGetController = require('../controllers/question/check/get');
const indexGetController = require('../controllers/question/index/get');

router.get(
  '/',
    isConfirmedDomain,
    indexGetController
);
router.get(
  '/check',
    isConfirmedDomain,
    checkGetController
);

module.exports = router;
