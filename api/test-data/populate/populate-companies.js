const Companies = require("../../models/Companies");
const dataSet = require("../data/test-data-companies.json");
require("../../dbConfig/db");

//populates database with preset datasets
Companies.create(dataSet)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
