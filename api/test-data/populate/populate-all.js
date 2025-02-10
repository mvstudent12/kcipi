const Resident = require("../../models/Resident");
const Admin = require("../../models/Admin");
const UnitTeam = require("../../models/UnitTeam");
const Employer = require("../../models/Employer");
const Company = require("../../models/Company");
const Classification = require("../../models/Classification");
const Facility_Management = require("../../models/Facility_Management");

const residentData = require("../data/test-data-resident.json");
const adminData = require("../data/test-data-admin.json");
const unitTeamData = require("../data/test-data-unitTeam.json");
const employersData = require("../data/test-data-employers.json");
const companiesData = require("../data/test-data-companies.json");
const classificationData = require("../data/test-data-classification.json");

const facility_managementData = require("../data/test-data-facility_management.json");

require("../../dbConfig/db");

const populateDB = async () => {
  await Facility_Management.create(facility_managementData)
    .then((result) => {})
    .catch((err) => {
      console.log("facility_management: ", err);
    }),
    //populates database with preset datasets
    await Resident.create(residentData)
      .then((result) => {})
      .catch((err) => {
        console.log("Resident: ", err);
      }),
    //populates database with preset datasets
    await Admin.create(adminData)
      .then((result) => {})
      .catch((err) => {
        console.log("Admin: ", err);
      }),
    //populates database with preset datasets
    await UnitTeam.create(unitTeamData)
      .then((result) => {})
      .catch((err) => {
        console.log("UnitTeam: ", err);
      }),
    //populates database with preset datasets
    await Employer.create(employersData)
      .then((result) => {})
      .catch((err) => {
        console.log("Employer: ", err);
      }),
    //populates database with preset datasets
    await Company.create(companiesData)
      .then((result) => {})
      .catch((err) => {
        console.log("Company: ", err);
      }),
    //populates database with preset datasets
    await Classification.create(classificationData)
      .then((result) => {})
      .catch((err) => {
        console.log("Classification: ", err);
      });
};
populateDB();
