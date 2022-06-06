const async = require('async');
const mongoose = require('mongoose');
const validator = require('validator');

const getWeek = require('../../utils/getWeek');

const Ad = require('../ad/Ad');
const Answer = require('../answer/Answer');
const Company = require('../company/Company');
const IntegrationPath = require('../integration_path/IntegrationPath');
const Product = require('../product/Product');
const Template = require('../template/Template');
const Question = require('../question/Question');

const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const DUPLICATED_UNIQUE_FIELD_ERROR_CODE = 11000;

const Schema = mongoose.Schema;

const PersonSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  }
});

PersonSchema.statics.findPersonById = function (id, callback) {
  const Person = this;

  if (!id || !validator.isMongoId(id.toString()))
    return callback('bad_request');

  Person.findById(mongoose.Types.ObjectId(id.toString()), (err, person) => {
    if (err) return callback('database_error');
    if (!person) return callback('document_not_found');

    return callback(null, person);
  });
};

PersonSchema.statics.createPerson = function (data, callback) {
  const Person = this;

  if (!data || !data.email || !validator.isEmail(data.email.toString()))
    return callback('bad_request');

  const newPersonData = {
    email: data.email.toString().trim()
  };

  const newPerson = new Person(newPersonData);

  newPerson.save((err, person) => {
    if (err && err.code == DUPLICATED_UNIQUE_FIELD_ERROR_CODE)
      return callback('duplicated_unique_field');
    if (err) return callback('database_error');

    return callback(null, person._id.toString());
  });
};

PersonSchema.statics.findOrCreatePersonByEmail = function (email, callback) {
  const Person = this;

  if (!email || typeof email != 'string')
    return callback('bad_request');

  Person.findOne({
    email: email.trim()
  }, (err, person) => {
    if (err) return callback('database_error');
    if (person) return callback(null, person);

    Person.createPerson({
      email: email.trim()
    }, (err, id) => {
      if (err) return callback(err);

      Person.findPersonById(id, (err, person) => {
        if (err) return callback(err);

        return callback(null, person);
      });
    });
  });
};

PersonSchema.statics.createAnswerGroup = function (data, callback) {
  const Person = this;

  if (!data.answer_given_to_question || typeof data.answer_given_to_question != 'string' || !data.answer_given_to_question.trim().length || data.answer_given_to_question.trim().length > MAX_DATABASE_TEXT_FIELD_LENGTH)
    return callback('bad_request');

  data.answer_given_to_question = data.answer_given_to_question.trim();
    
  Question.findQuestionById(data.question_id, (err, question) => {
    if (err) return callback(err);
    if (!data.company_id || question.company_id.toString() != data.company_id.toString())
      return callback('not_authenticated_request');

    Template.findTemplateById(question.template_id, (err, template) => {
      if (err) return callback(err);

      if (template.subtype == 'yes_no' && !['yes', 'no'].includes(data.answer_given_to_question))
        return callback('bad_request');

      if ((template.subtype == 'single' || template.subtype == 'multiple' || template.subtype == 'list') && !template.choices.includes(data.answer_given_to_question))
        return callback('bad_request');

      if ((template.subtype == 'scale' || template.subtype == 'number') && (isNaN(parseInt(data.answer_given_to_question)) || template.min_value > parseInt(data.answer_given_to_question) || template.max_value < parseInt(data.answer_given_to_question)))
        return callback('bad_request');

      let timeout_duration_in_week = template.timeout_duration_in_week;

      if (template.subtype == 'time' && template.timeout_duration_in_week_by_choices && template.timeout_duration_in_week_by_choices[data.answer_given_to_question])
        timeout_duration_in_week = template.timeout_duration_in_week_by_choices[data.answer_given_to_question];

      getWeek(0, (err, curr_week) => {
        if (err) return callback(err);
    
        getWeek(timeout_duration_in_week, (err, exp_week) => {
          if (err) return callback(err);
      
          const newAnswerData = {
            template_id: template._id,
            question_id: question._id,
            answer_given_to_question: data.answer_given_to_question,
            week_answer_is_given_in_unix_time: curr_week,
            week_answer_will_be_outdated_in_unix_time: exp_week
          };

          return Answer.createAnswerWithoutProcessing(newAnswerData, (err, id) => callback(err, id));
        });
      });
    });
  });
};

PersonSchema.statics.pushPersonToAnswerGroup = function (data, callback) {
  const Person = this;

  if (Array.isArray(data.answer_given_to_question)) {
    if (!data.answer_given_to_question.length)
      return callback('bad_request');

    Question.findQuestionById(data.question_id, (err, question) => {
      if (err) return callback(err);

      Template.findTemplateById(question.template_id, (err, template) => {
        if (err) return callback(err);
        if (template.subtype != 'multiple') return callback('bad_request');

        async.timesSeries(
          data.answer_given_to_question.length,
          (time, next) => {
            let newData = {};
            newData = JSON.parse(JSON.stringify(data));
            newData.answer_given_to_question = data.answer_given_to_question[time];
            
            return Person.pushPersonToAnswerGroup(newData, err => next(err));
          },
          err => {
            if (err) return callback(err);
    
            return callback(null);
          }
        );
      });
    });
  } else {
    if (!data.answer_given_to_question || typeof data.answer_given_to_question != 'string' || !data.answer_given_to_question.trim().length || data.answer_given_to_question.trim().length > MAX_DATABASE_TEXT_FIELD_LENGTH)
      return callback('bad_request');

    if (!data.company_id)
      return callback('bad_request');

    data.answer_given_to_question = data.answer_given_to_question.trim();

    Person.findPersonById(data.person_id, (err, person) => {
      if (err) return callback(err);

      Question.findQuestionById(data.question_id, (err, question) => {
        if (err) return callback(err);
        if (question.company_id.toString() != data.company_id.toString())
          return callback('not_authenticated_request');

        Answer.checkAnswerExists({
          question_id: question._id,
          answer_given_to_question: data.answer_given_to_question,
          person_id: data.person_id
        }, res => {
          if (res) return callback(null);

          getWeek(0, (err, curr_week) => {
            if (err) return callback(err);

            Answer.checkAnswerExists({
              question_id: question._id,
              answer_given_to_question: data.answer_given_to_question,
              week_answer_is_given_in_unix_time: curr_week,
              person_id_list_not_full: true
            }, res => {
              if (res) {
                Answer.findOneAnswer({
                  question_id: question._id,
                  answer_given_to_question: data.answer_given_to_question,
                  week_answer_is_given_in_unix_time: curr_week,
                  person_id_list_not_full: true
                }, (err, answer) => {
                  if (err) return callback(err);

                  Answer.findAnswerByIdAndPushPerson(answer._id, {
                    person_id: data.person_id
                  }, err => {
                    if (err) return callback(err);

                    return callback(null);
                  });
                });
              } else {
                Person.createAnswerGroup({
                  question_id: question._id,
                  company_id: data.company_id,
                  answer_given_to_question: data.answer_given_to_question
                }, (err, id) => {
                  if (err) return callback(err);

                  Answer.findAnswerByIdAndPushPerson(id, {
                    person_id: data.person_id
                  }, err => {
                    if (err) return callback(err);

                    return callback(null);
                  });
                });
              };
            });
          });
        });
      });
    });
  }
};

PersonSchema.statics.updatePersonAnswerGroupUsingCommonDatabase = function (data, callback) {
  const Person = this;

  Company.findCompanyById(data.company_id, (err, company) => {
    if (err) return callback(err);

    Person.findPersonById(data.person_id, (err, person) => {
      if (err) return callback(err);

      Question.findQuestionById(data.question_id, (err, question) => {
        if (err) return callback(err);

        if (question.company_id.toString() != company._id.toString())
          return callback('not_authenticated_request');

        Answer.findAnswers({
          template_id: question.template_id,
          person_id: person._id
        }, (err, answers) => {
          if (err) return callback(err);

          async.timesSeries(
            answers.length,
            (time, next) => {
              const answer = answers[time];

              Person.pushPersonToAnswerGroup({
                answer_given_to_question: answer.answer_given_to_question,
                person_id: person._id,
                question_id: question._id,
                company_id: company._id
              }, err => next(err));
            },
            err => {
              if (err) return callback(err);

              return callback(null);
            }
          );
        });
      });
    });
  });
}

PersonSchema.statics.pullPersonFromAnswerGroups = function (data, callback) {
  const Person = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');
  
  if (!data.path || typeof data.path != 'string')
    return callback('bad_request');

  Person.findPersonById(data.person_id, (err, person) => {
    if (err) return callback(err);

    Company.findCompanyById(data.company_id, (err, company) => {
      if (err) return callback(err);

      IntegrationPath.findIntegrationPathsByCompanyIdAndPath(data, (err, integration_paths) => {
        if (err) return callback(err);
        if (!integration_paths || !integration_paths.length)
          return callback(null);

        Question.findQuestionsByFiltersAndSorted({
          company_id: company._id,
          integration_path_id_list: integration_paths.map(each => each._id.toString())
        }, (err, questions) => {
          if (err) return callback(err);
  
          async.timesSeries(
            questions.length,
            (time, next) => {
              const question = questions[time];
  
              Answer.findAnswerByPersonIdAndQuestionIdAndDelete({
                person_id: person._id,
                question_id: question._id
              }, err => {
                if (err) return next(err);

                return next(null);
              });
            },
            err => {
              if (err && err != 'process_complete')
                return callback(err);
              if (!err)
                return callback(null);
  
              Question.findQuestionByIdAndFormat(found_question._id, (err, question) => {
                if (err) return callback(err);
  
                return callback(null, question);
              });
            }
          );
        });
      });
    });
  });
};

PersonSchema.statics.getNextQuestionForPerson = function (data, callback) {
  const Person = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');
  
  if (!data.path || typeof data.path != 'string')
    return callback('bad_request');

  const last_question_number = data.last_question && Number.isInteger(data.last_question) ? data.last_question : -1;

  Person.findPersonById(data.person_id, (err, person) => {
    if (err) return callback(err);

    Company.findCompanyById(data.company_id, (err, company) => {
      if (err) return callback(err);

      IntegrationPath.findIntegrationPathsByCompanyIdAndPath(data, (err, integration_paths) => {
        if (err) return callback(err);
        if (!integration_paths || !integration_paths.length)
          return callback(null);

        Question.findQuestionsByFiltersAndSorted({
          company_id: company._id,
          min_order_number: last_question_number,
          is_active: true,
          integration_path_id_list: integration_paths.map(each => each._id.toString())
        }, (err, questions) => {
          if (err) return callback(err);
          let found_question = null;
  
          async.timesSeries(
            questions.length,
            (time, next) => {
              const question = questions[time];
  
              Answer.findOneAnswer({
                template_id: question.template_id,
                person_id: person._id
              }, err => {
                if (err && err != 'document_not_found') return next(err);
    
                if (!err) {
                  Person.updatePersonAnswerGroupUsingCommonDatabase({
                    company_id: company._id,
                    question_id: question._id,
                    person_id: person._id
                  }, err => {
                    if (err) return next(err);
    
                    return next(null);
                  });
                } else {
                  found_question = question;
                  return next('process_complete');
                }
              });
            },
            err => {
              if (err && err != 'process_complete')
                return callback(err);
              if (!err)
                return callback(null);
  
              Question.findQuestionByIdAndFormat(found_question._id, (err, question) => {
                if (err) return callback(err);
  
                return callback(null, question);
              });
            }
          );
        });
      });
    });
  });
};

PersonSchema.statics.checkNextQuestionExists = function (data, callback) {
  const Person = this;

  if (!data || typeof data != 'object')
    return callback('bad_request');
  
  if (!data.path || typeof data.path != 'string')
    return callback('bad_request');

  if (!data.person_id) {
    Company.findCompanyById(data.company_id, (err, company) => {
      if (err) return callback(err);

      IntegrationPath.findIntegrationPathsByCompanyIdAndPath(data, (err, integration_paths) => {
        if (err) return callback(err);
        if (!integration_paths || !integration_paths.length)
          return callback(null, false);

        Question.findQuestionsByFiltersAndSorted({
          company_id: company._id,
          is_active: true,
          integration_path_id_list: integration_paths.map(each => each._id.toString())
        }, (err, questions) => {
          if (err) return callback(err);
          if (!questions.length)
            return callback(null, false);

          return callback(null, true)
        });
      });
    });
  } else {
    Person.findPersonById(data.person_id, (err, person) => {
      if (err) return callback(err);
  
      Company.findCompanyById(data.company_id, (err, company) => {
        if (err) return callback(err);
  
        IntegrationPath.findIntegrationPathsByCompanyIdAndPath(data, (err, integration_paths) => {
          if (err) return callback(err);
          if (!integration_paths || !integration_paths.length)
            return callback(null, false);
  
          Question.findQuestionsByFiltersAndSorted({
            company_id: company._id,
            is_active: true,
            integration_path_id_list: integration_paths.map(each => each._id.toString())
          }, (err, questions) => {
            if (err) return callback(err);
            let found_question = null;
    
            async.timesSeries(
              questions.length,
              (time, next) => {
                const question = questions[time];
    
                Answer.findOneAnswer({
                  template_id: question.template_id,
                  person_id: person._id
                }, err => {
                  if (err && err != 'document_not_found') return next(err);
      
                  if (!err) {
                    Person.updatePersonAnswerGroupUsingCommonDatabase({
                      company_id: company._id,
                      question_id: question._id,
                      person_id: person._id
                    }, err => {
                      if (err) return next(err);
      
                      return next(null);
                    });
                  } else {
                    found_question = question;
                    return next('process_complete');
                  }
                });
              },
              err => {
                if (err && err != 'process_complete')
                  return callback(err);
                if (!err)
                  return callback(null, false);
    
                return callback(null, true);
              }
            );
          });
        });
      });
    });
  }
};

PersonSchema.statics.updateAdStatistics = function (data, callback) {
  const Person = this;

  Person.findPersonById(data.person_id, (err, person) => {
    if (err) return callback(err);

    Ad.findAdById(data.ad_id, (err, ad) => {
      if (err) return callback(err);
      if (ad.company_id.toString() != data.company_id.toString())
        return callback('not_authenticated_request');
      
      Ad.findAdByIdAndUpdatePersonStatus(data, err => {
        if (err) return callback(err);
  
        return callback(null);
      });
    });
  });
};

PersonSchema.statics.getNextAdForPerson = function (data, callback) {
  const Person = this;

  Person.findPersonById(data.person_id, (err, person) => {
    if (err) return callback(err);

    IntegrationPath.findIntegrationPathsByCompanyIdAndPath({
      company_id: data.company_id,
      path: data.path
    }, (err, integration_paths) => {
      if (err) return next(err);
      if (!integration_paths.length)
        return next(null);

      Ad.findAdsByFiltersAndSorted({
        company_id: data.company_id,
        integration_path_id_list: integration_paths.map(each => each._id.toString()),
        is_active: true
      }, (err, ads) => {
        if (err) return callback(err);
        let found_ad = null;
  
        async.timesSeries(
          ads.length,
          (time, next) => {
            Ad.findAdByIdAndCheckIfPersonCanSee({
              ad_id: ads[time]._id,
              company_id: data.company_id,
              person_id: person._id
            }, (err, res) => {
              if (err) return next(err);
              if (!res) return next(null);
  
              found_ad = ads[time];
              return next('process_complete');
            });
          },
          err => {
            if (err && err != 'process_complete') return callback(err);
            if (!found_ad) return callback(null, null);
  
            Person.updateAdStatistics({
              person_id: person._id,
              ad_id: found_ad._id,
              company_id: data.company_id,
              status: 'showed'
            }, err => {
              if (err) return callback(err);
  
              return callback(null, found_ad);
            });
          }
        );
      });
    });
  });
};

module.exports = mongoose.model('Person', PersonSchema);
