const Admin = require("../../models/Admin");
const dataSet = require("../data/test-data-admin.json");
require("../../dbConfig/db");

//populates database with preset datasets
Admin.create(dataSet)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
