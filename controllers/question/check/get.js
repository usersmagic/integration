const Person = require('../../../models/person/Person');

module.exports = (req, res) => {
  if (req.query.email) {
    Person.findOrCreatePersonByEmail(req.query.email, (err, person) => {
      if (err) {
        res.write(JSON.stringify({ error: err, success: false }));
        return res.end();
      }
  
      Person.checkNextQuestionExists({
        path: req.query.path,
        person_id: person._id,
        company_id: req.session.company_id
      }, (err, result) => {
        if (err) {
          res.write(JSON.stringify({ error: err, success: false }));
          return res.end();
        }
  
        res.write(JSON.stringify({ result, success: true }));
        return res.end();
      });
    });
  } else {
    Person.checkNextQuestionExists({
      path: req.query.path,
      company_id: req.session.company_id
    }, (err, result) => {
      if (err) {
        res.write(JSON.stringify({ error: err, success: false }));
        return res.end();
      }

      res.write(JSON.stringify({ result, success: true }));
      return res.end();
    });
  } 
}
