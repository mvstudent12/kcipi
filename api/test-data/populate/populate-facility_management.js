const Facility_Management = require("../../models/Facility_Management");
const dataSet = require("../data/test-data-facility_management.json");
require("../../dbConfig/db");

//populates database with preset datasets
Facility_Management.create(dataSet)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
