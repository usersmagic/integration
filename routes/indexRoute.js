const express = require('express');
const router = express.Router();

const isConfirmedDomain = require('../middleware/isConfirmedDomain');

const adGetController = require('../controllers/index/ad/get');
const companyDataController = require('../controllers/index/company_data/get');
const integrationRoutesGetController = require('../controllers/index/integration_routes/get');
const languageGetController = require('../controllers/index/language/get');
const personGetController = require('../controllers/index/person/get');
const questionGetController = require('../controllers/index/question/get');

const answerPostController = require('../controllers/index/answer/post');

router.get(
  '/ad',
    isConfirmedDomain,
    adGetController
);
router.get(
  '/company_data',
    isConfirmedDomain,
    companyDataController
);
router.get(
  '/person',
    isConfirmedDomain,
    personGetController
);
router.get(
  '/question',
    isConfirmedDomain,
    questionGetController
);

router.post(
  '/answer',
    isConfirmedDomain,
    answerPostController
);

module.exports = router;
