const express = require('express');
const router = express.Router();

const isConfirmedDomain = require('../middleware/isConfirmedDomain');

const checkGetController = require('../controllers/question/check/get');
const indexGetController = require('../controllers/question/index/get');

const deletePostController = require('../controllers/question/delete/post');

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

router.post(
  '/delete',
    isConfirmedDomain,
    deletePostController
);

module.exports = router;
