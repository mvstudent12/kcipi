const Classification = require("../../models/Classification");
const dataSet = require("../data/test-data-classification.json");
require("../../dbConfig/db");

//populates database with preset datasets
Classification.create(dataSet)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
