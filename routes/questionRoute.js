const express = require('express');
const router = express.Router();

const isConfirmedDomain = require('../middleware/isConfirmedDomain');

const indexGetController = require('../controllers/question/get');

router.get(
  '/',
    isConfirmedDomain,
    indexGetController
);

module.exports = router;
