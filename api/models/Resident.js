const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const resumeSchema = new Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  unitTeam: { type: String },
  legalCitizen: { type: Boolean, required: true },
  hsGraduate: { type: Boolean, required: true },
  sscard: { type: Boolean, required: true },
  birthCertificate: { type: Boolean, required: true },
  workHistory: { type: String },
  certifications: { type: String },
  education: { type: String },
  programs: { type: String },
  status: {
    type: String,
    enum: [
      "none",
      "submitted",
      "approved_Medical",
      "approved_eai",
      "approved_unitTeam",
      "approved_all",
    ],
    default: "none",
  },
  approvalHistory: [
    {
      department: String,
      approvedAt: Date,
      approvedBy: String,
    },
  ],
});

const residentSchema = new Schema({
  role: {
    type: String,
    default: "resident",
  },
  residentID: {
    type: String,
    unique: true,
    required: [true, "Please enter resident ID"],
    lowercase: true,
  },
  firstName: {
    type: String,
    lowercase: true,
    required: [true, "Please enter resident's first name"],
  },
  lastName: {
    type: String,
    lowercase: true,
    required: [true, "Please enter resident's last name"],
  },
  facility: {
    type: String,
    lowercase: true,
    required: [true, "Please enter resident's facility"],
  },
  custodyLevel: {
    type: String,
    lowercase: true,
    required: [true, "Please enter resident's custody level"],
  },
  unitTeam: {
    type: String,
    lowercase: true,
  },
  jobPool: {
    type: String,
    lowercase: true,
  },
  jobApplications: [], // References to job applications
  resume: resumeSchema,
  resumeIsComplete: { type: Boolean, default: false },
  resumeIsApproved: { type: Boolean, default: false },
  resumeRejectionReason: { type: String, lowercase: true, default: "" },
  //Medical clearance

  MedicalReviewed: { type: Boolean, default: false },
  MedicalNotes: [{ type: String, lowercase: true, default: "" }],
  MedicalClearance: { type: Boolean, default: false },
  MedicalClearanceDate: { type: Date },
  MedicalClearedBy: { type: String, lowercase: true, default: "" },
  MedicalClearanceRemovedBy: { type: String, lowercase: true, default: "" },
  MedicalClearanceRemovedDate: { type: Date },
  MedicalRestriction: { type: Boolean, default: false },
  MedicalRestrictionDate: { type: Date },
  MedicalRestrictedBy: { type: String, lowercase: true, default: "" },
  //eai clearance
  EAIReviewed: { type: Boolean, default: false },
  EAINotes: [{ type: String, lowercase: true, default: "" }],
  EAIClearance: { type: Boolean, default: false },
  EAIClearanceDate: { type: Date },
  EAIClearedBy: { type: String, lowercase: true, default: "" },
  EAIClearanceRemovedBy: { type: String, lowercase: true, default: "" },
  EAIClearanceRemovedDate: { type: Date },
  EAIRestriction: { type: Boolean, default: false },
  EAIRestrictionDate: { type: Date },
  EAIRestrictedBy: { type: String, lowercase: true, default: "" },
  //Classification clearance
  ClassificationReviewed: { type: Boolean, default: false },
  ClassificationNotes: [{ type: String, lowercase: true, default: "" }],
  ClassificationClearance: { type: Boolean, default: false },
  ClassificationClearanceDate: { type: Date },
  ClassificationClearedBy: { type: String, lowercase: true, default: "" },
  ClassificationClearanceRemovedBy: {
    type: String,
    lowercase: true,
    default: "",
  },
  ClassificationClearanceRemovedDate: { type: Date },
  ClassificationRestriction: { type: Boolean, default: false },
  ClassificationRestrictionDate: { type: Date },
  ClassificationRestrictedBy: { type: String, lowercase: true, default: "" },
  //Warden clearance
  WardenReviewed: { type: Boolean, default: false },
  WardenNotes: [{ type: String, lowercase: true, default: "" }],
  WardenClearance: { type: Boolean, default: false },
  WardenClearanceDate: { type: Date },
  WardenClearedBy: { type: String, lowercase: true, default: "" },
  WardenClearanceRemovedBy: {
    type: String,
    lowercase: true,
    default: "",
  },
  WardenClearanceRemovedDate: { type: Date },
  WardenRestriction: { type: Boolean, default: false },
  WardenRestrictionDate: { type: Date },
  WardenRestrictedBy: { type: String, lowercase: true, default: "" },
  //Sex Offender
  isSexOffender: { type: Boolean, default: false },
  sexOffenderReviewed: { type: Boolean, default: false },
  sexOffenderNotes: [{ type: String, lowercase: true, default: "" }],
  sexOffenderClearance: { type: Boolean, default: false },
  sexOffenderClearanceDate: { type: Date },
  sexOffenderClearedBy: { type: String, lowercase: true, default: "" },
  sexOffenderClearanceRemovedBy: {
    type: String,
    lowercase: true,
    default: "",
  },
  sexOffenderClearanceRemovedDate: { type: Date },
  sexOffenderRestriction: { type: Boolean, default: false },
  sexOffenderRestrictionDate: { type: Date },
  sexOffenderRestrictedBy: { type: String, lowercase: true, default: "" },
  //Complete Eligibility Status
  isEligibleToWork: { type: Boolean, default: false },
  eligibilityApprovedBy: {
    type: String,
    lowercase: true,
    default: "",
  },
  isRestrictedFromWork: { type: Boolean, default: false },
  eligibilityRestrictedBy: {
    type: String,
    lowercase: true,
    default: "",
  },
  eligibilityRestrictionReason: {
    type: String,
    lowercase: true,
    default: "",
  },
});

//static method to find resident
residentSchema.statics.findResident = async function (residentID) {
  const resident = await this.findOne({ residentID }).lean();
  if (resident) {
    return resident;
  }
  throw Error("residentID does not exist");
};

const Resident = mongoose.model("resident", residentSchema);
module.exports = Resident;
