const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const applicantSchema = new Schema(
  {
    resident_id: { type: mongoose.Schema.Types.ObjectId, ref: "Resident" },
    hireRequest: { type: Boolean, default: false },
    hireRequestDate: { type: Date, required: true },
    hireRequestStartDate: { type: Date, required: true },
    hireRequestInfo: { type: String, trim: true },
    dateApplied: { type: Date, required: true },
  },
  { timestamps: true }
);

const interviewSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
      default: "active",
    },
    isRequested: { type: Boolean, default: false },
    preferredDate: { type: String, trim: true },
    employerInstructions: { type: String, trim: true },
    requestedBy: { type: String, trim: true },
    dateRequested: { type: Date, required: true },
    residentID: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    dateScheduled: { type: Date, required: true },
    time: { type: String, required: true }, // Store time as a string in HH:mm or other formats
    instructions: { type: String, trim: true },
  },
  { timestamps: true }
);

const jobSchema = new Schema(
  {
    companyID: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    companyName: { type: String, lowercase: true, trim: true },
    position: { type: String, lowercase: true, trim: true },
    facility: { type: String, lowercase: true, trim: true },
    availablePositions: {
      type: Number,
      default: 0,
      min: [0, "Available positions cannot be negative"],
    },
    description: { type: String, lowercase: true, trim: true },
    skillSet: { type: String, lowercase: true, trim: true },
    pay: { type: String, lowercase: true, trim: true },
    jobPool: { type: String, lowercase: true, trim: true },
    applicants: [applicantSchema],
    interviews: [interviewSchema],
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resident" }],
    isAvailable: { type: Boolean, default: true },
    dateCreated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Jobs = mongoose.model("jobs", jobSchema);
module.exports = Jobs;
