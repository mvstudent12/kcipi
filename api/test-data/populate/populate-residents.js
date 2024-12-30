const Resident = require("../../models/Resident");
const dataSet = require("../data/test-data-resident.json");
require("../../dbConfig/db");

//populates database with preset datasets
Resident.create(dataSet)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
