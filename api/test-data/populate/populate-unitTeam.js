const UnitTeam = require("../../models/UnitTeam");
const dataSet = require("../data/test-data-unitTeam.json");
require("../../dbConfig/db");

//populates database with preset datasets
UnitTeam.create(dataSet)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
