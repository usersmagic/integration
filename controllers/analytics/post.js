const Person = require('../../models/person/Person');

module.exports = (req, res) => {
  Person.findOrCreatePersonByEmail(req.query.email, (err, person) => {
    if (err) {
      res.write(JSON.stringify({ error: err, success: false }));
      return res.end();
    }

    req.body.person_id = person._id;
    req.body.company_id = req.session.company_id;

    Person.updatePersonAnalyticsData(req.body, (err) => {
      if (err) {
        res.write(JSON.stringify({ error: err, success: false }));
        return res.end();
      }

      res.write(JSON.stringify({ success: true }));
      return res.end();
    });
  });
}
