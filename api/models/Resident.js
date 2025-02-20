const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const terminationRequestSchema = new Schema({
  companyName: { type: String, required: true },
  requestDate: { type: Date, default: Date.now },
  terminationReason: { type: String, required: true },
  notes: { type: String, required: true },
});

const resumeSchema = new Schema({
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "incomplete"],
    required: true,
    default: "incomplete", // Default status is "incomplete"
  },
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
  approvedBy: { type: String, lowercase: true },
  approvalDate: { type: Date },
  rejectionReason: { type: String, lowercase: true, default: "" },
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
  jobPool: {
    type: String,
    lowercase: true,
    enum: [
      "Male Minimum 1 (Off-Site)",
      "Male Minimum 2 (On-Site)",
      "Male Medium/Maximum",
      "Female Minimum 1 (Off-Site)",
      "Female Minimum 2 (On-Site)",
      "Female Medium/Maximum",
      "Not Eligible: Medical Lay-In / Disciplinary Lay-In",
      "PIE Employed",
    ],
  },

  resume: resumeSchema,
  resumeIsComplete: { type: Boolean, default: false },

  MedicalClearance: { type: clearanceSchema, default: () => ({}) },
  EAIClearance: { type: clearanceSchema, default: () => ({}) },
  ClassificationClearance: { type: clearanceSchema, default: () => ({}) },
  DWClearance: { type: clearanceSchema, default: () => ({}) },
  WardenClearance: { type: clearanceSchema, default: () => ({}) },
  sexOffenderClearance: { type: clearanceSchema, default: () => ({}) },
  victimServicesClearance: { type: clearanceSchema, default: () => ({}) },

  workEligibility: { type: clearanceSchema, default: () => ({}) },

  isHired: { type: Boolean, default: false },
  dateHired: { type: Date },
  companyName: { type: String, lowercase: true, default: "" },
  workHistory: [workHistorySchema],
  terminationRequest: terminationRequestSchema,
});

// Pre-save hook to ensure that the resume status is "incomplete" if not provided for new residents
residentSchema.pre("save", function (next) {
  // Check if resume exists, if not, initialize it
  if (this.isNew) {
    if (!this.resume) {
      this.resume = {}; // Initialize resume object if not present
    }
    if (!this.resume.status) {
      this.resume.status = "incomplete"; // Set default status if not provided
    }
  }
  next();
});

// Static method to find resident
residentSchema.statics.findResident = async function (residentID) {
  const resident = await this.findOne({ residentID, isActive: true }).lean();
  if (resident) {
    return resident;
  }
  throw Error("residentID does not exist");
};

const Resident = mongoose.model("resident", residentSchema);
module.exports = Resident;
