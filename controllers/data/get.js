const Company = require('../../models/company/Company');

module.exports = (req, res) => {
  Company.findCompanyByIdAndFormat(req.session.company_id, (err, company) => {
    if (err) {
      res.write(JSON.stringify({ error: err, success: false }));
      return res.end();
    }

    res.write(JSON.stringify({
      success: true,
      company
    }));
    
    return res.end();
  });
}
