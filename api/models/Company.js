const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const jobSchema = new Schema({
  position: { type: String, lowercase: true },
  description: { type: String, lowercase: true },
  pay: { type: String, lowercase: true },
  jobPool: { type: String, lowercase: true },
  applicants: [],
  isAvailable: { type: Boolean, default: true },
  dateCreated: { type: Date, default: Date.now },
});

const companySchema = new Schema({
  companyName: {
    type: String,
    lowercase: true,
    required: true,
  },
  facility: {
    type: String,
    required: true,
  },
  jobs: [jobSchema],
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employer", // This establishes the relationship to the Employer model
  },
});

const Employer = mongoose.model("company", companySchema);
module.exports = Employer;
