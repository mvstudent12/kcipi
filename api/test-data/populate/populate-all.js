const Resident = require("../../models/Resident");
const Admin = require("../../models/Admin");
const UnitTeam = require("../../models/UnitTeam");
const Employer = require("../../models/Employer");
const Company = require("../../models/Company");
const Facility_Management = require("../../models/Facility_Management");

const residentData = require("../data/test-data-resident.json");
const adminData = require("../data/test-data-admin.json");
const unitTeamData = require("../data/test-data-unitTeam.json");
const employersData = require("../data/test-data-employers.json");
const companiesData = require("../data/test-data-companies.json");
const facility_managementData = require("../data/test-data-facility_management.json");

require("../../dbConfig/db");

//populates database with preset datasets
Facility_Management.create(facility_managementData)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });

//populates database with preset datasets
Resident.create(residentData)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });

//populates database with preset datasets
Admin.create(adminData)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });

//populates database with preset datasets
UnitTeam.create(unitTeamData)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });

//populates database with preset datasets
Employer.create(employersData)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });

//populates database with preset datasets
Company.create(companiesData)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
