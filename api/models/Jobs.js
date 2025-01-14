const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const jobSchema = new Schema({
  companyID: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  companyName: { type: String, lowercase: true, trim: true },
  position: { type: String, lowercase: true, trim: true },
  facility: { type: String, lowercase: true, trim: true },
  availablePositions: { type: Number, default: 0 },
  description: { type: String, lowercase: true, trim: true },
  pay: { type: String, lowercase: true, trim: true },
  jobPool: { type: String, lowercase: true, trim: true },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resident" }],
  isAvailable: { type: Boolean, default: true },
  dateCreated: { type: Date, default: Date.now },
});

const Jobs = mongoose.model("jobs", jobSchema);
module.exports = Jobs;
