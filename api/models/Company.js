const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const companySchema = new Schema({
  companyName: {
    type: String,
    lowercase: true,
    required: true,
    index: true,
    trim: true,
    unique: true,
  },
  facility: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
});

const Company = mongoose.model("company", companySchema);
module.exports = Company;
