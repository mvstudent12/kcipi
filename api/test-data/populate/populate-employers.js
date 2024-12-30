const Employers = require("../../models/Employers");
const dataSet = require("../data/test-data-employers.json");
require("../../dbConfig/db");

//populates database with preset datasets
Employers.create(dataSet)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
