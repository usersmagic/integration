const Company = require('../../../models/company/Company');

module.exports = (req, res) => {
  Company.findCompanyById(req.session.company_id, (err, company) => {
    if (err) {
      res.write(JSON.stringify({ error: err, success: false }));
      return res.end();
    }

    res.write(JSON.stringify({
      language: company.preferred_language,
      integration_routes: company.integration_routes,
      preferred_color: company.preferred_color,
      success: true
    }));
    
    return res.end();
  });
}
