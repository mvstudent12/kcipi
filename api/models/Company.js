const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const jobSchema = new Schema({
  position: { type: String, lowercase: true, trim: true },
  availablePositions: {
    type: String,
    lowercase: true,
    trim: true,
    default: "0",
  },
  description: { type: String, lowercase: true, trim: true },
  pay: { type: String, lowercase: true, trim: true },
  jobPool: { type: String, lowercase: true, trim: true },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resident" }],
  isAvailable: { type: Boolean, default: true },
  dateCreated: { type: Date, default: Date.now },
});

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
  },
  jobs: { type: [jobSchema], default: [] },
});

const Company = mongoose.model("company", companySchema);
module.exports = Company;
