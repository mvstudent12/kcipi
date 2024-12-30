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
      "approved_medical",
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
  resume: resumeSchema,
  resumeIsComplete: { type: Boolean, default: false },
  resumeIsApproved: { type: Boolean, default: false },
  resumeRejectionReason: { type: String, lowercase: true, default: "" },
  medicalNotes: [{ type: String, lowercase: true, default: "" }],
  medicalClearance: { type: Boolean, default: false },
  medicalClearanceDate: { type: Date },
  medicallyClearedBy: { type: String, lowercase: true, default: "" },
  medicalClearanceRemovedBy: { type: String, lowercase: true, default: "" },
  medicalClearanceRemovedDate: { type: Date },
  medicalRestriction: { type: Boolean, default: false },
  medicalRestrictionDate: { type: Date },
  medicallyRestrictedBy: { type: String, lowercase: true, default: "" },
  eaiClearance: { type: Boolean, default: false },
  sexOffender: { type: Boolean, default: false },
  jobApplications: [], // References to job applications
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
