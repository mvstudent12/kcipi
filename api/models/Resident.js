const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const terminationRequestSchema = new Schema({
  companyName: { type: String, required: true },
  requestDate: { type: Date, default: Date.now },
  terminationReason: { type: String, required: true },
  notes: { type: String, required: true },
});

const resumeSchema = new Schema({
  createdAt: { type: Date, default: Date.now },
  unitTeam: { type: String },
  legalCitizen: { type: Boolean, required: true },
  hsGraduate: { type: Boolean, required: true },
  sscard: { type: Boolean, required: true },
  birthCertificate: { type: Boolean, required: true },
  workHistory: { type: String },
  certifications: { type: String },
  education: { type: String },
  programs: { type: String },
  skills: { type: String },
});

const clearanceRecordSchema = new Schema({
  createdAt: { type: Date, default: Date.now },
  action: {
    type: String,
    enum: ["approved", "pending", "restricted"],
    required: true,
  },
  performedBy: { type: String, lowercase: true, required: true },
  reason: { type: String, lowercase: true, default: "" },
});

const clearanceSchema = new Schema({
  status: {
    type: String,
    enum: ["approved", "pending", "restricted", "none"],
    required: true,
    default: "none",
  },
  clearanceHistory: [clearanceRecordSchema],

  notes: [
    {
      createdAt: { type: Date, default: Date.now },
      createdBy: { type: String, required: true },
      note: { type: String, required: true },
    },
  ],
});
const workHistorySchema = new Schema({
  companyName: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  reasonForLeaving: { type: String, default: "" },
  note: {
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, required: true },
    note: { type: String, required: true },
  },
});

const residentSchema = new Schema({
  role: { type: String, default: "resident" },
  isActive: { type: Boolean, default: true },
  residentID: { type: String, unique: true, required: true, lowercase: true },
  firstName: { type: String, lowercase: true, required: true },
  lastName: { type: String, lowercase: true, required: true },
  facility: { type: String, lowercase: true, required: true },
  outDate: { type: Date, required: true },
  custodyLevel: { type: String, lowercase: true, required: true },
  unitTeam: { type: String, lowercase: true },
  jobPool: { type: String, lowercase: true },

  resume: resumeSchema,
  resumeIsComplete: { type: Boolean, default: false },
  resumeIsApproved: { type: Boolean, default: false },
  resumeApprovedBy: { type: String, lowercase: true },
  resumeApprovalDate: { type: Date },
  resumeRejectionReason: { type: String, lowercase: true, default: "" },

  MedicalClearance: { type: clearanceSchema, default: () => ({}) },
  EAIClearance: { type: clearanceSchema, default: () => ({}) },
  ClassificationClearance: { type: clearanceSchema, default: () => ({}) },
  DWClearance: { type: clearanceSchema, default: () => ({}) },
  WardenClearance: { type: clearanceSchema, default: () => ({}) },
  sexOffenderClearance: { type: clearanceSchema, default: () => ({}) },
  victimServicesClearance: { type: clearanceSchema, default: () => ({}) },

  // Combined eligibility with the same structure as other clearances
  workEligibility: { type: clearanceSchema, default: () => ({}) },

  isHired: { type: Boolean, default: false },
  dateHired: { type: Date },
  companyName: { type: String, lowercase: true, default: "" },
  workHistory: [workHistorySchema],
  terminationRequest: terminationRequestSchema,
});

//static method to find resident
residentSchema.statics.findResident = async function (residentID) {
  const resident = await this.findOne({ residentID, isActive: true }).lean();
  if (resident) {
    return resident;
  }
  throw Error("residentID does not exist");
};

const Resident = mongoose.model("resident", residentSchema);
module.exports = Resident;
