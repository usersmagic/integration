const Person = require('../../../models/person/Person');

module.exports = (req, res) => {
  Person.findOrCreatePersonByEmail(req.query.email, (err, person) => {
    if (err) {
      res.write(JSON.stringify({ error: err, success: false }));
      return res.end();
    }

    Person.getNextAdForPerson({
      person_id: person._id,
      path: req.query.path,
      company_id: req.session.company_id
    }, (err, ad) => {
      if (err) {
        res.write(JSON.stringify({ error: err, success: false }));
        return res.end();
      }
  
      res.write(JSON.stringify({
        ad,
        success: true
      }));
      
      return res.end();
    });
  });
}
