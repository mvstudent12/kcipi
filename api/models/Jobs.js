const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const applicantSchema = new Schema(
  {
    resident_id: { type: mongoose.Schema.Types.ObjectId, ref: "Resident" },
    residentID: {
      type: String,
      required: true,
      match: [/^\d{7}$/, "Resident ID must be exactly 7 digits"],
    },
    residentName: { type: String, required: true },
    position: { type: String, lowercase: true, trim: true },
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
    dateApplied: { type: Date, required: true },
    hireRequest: { type: Boolean, default: false },
    hireRequestDate: { type: Date, required: true },
    hireRequestStartDate: { type: Date, required: true },
    hireRequestInfo: { type: String, trim: true },

    interview: {
      status: {
        type: String,
        enum: ["none", "requested", "scheduled"],
        required: true,
        default: "none",
      },
      preferredDate: { type: String, trim: true },
      employerInstructions: { type: String, trim: true },
      requestedBy: { type: String, trim: true },
      dateRequested: { type: Date, required: true },
      dateScheduled: { type: Date, required: true },
      time: { type: String, required: true },
      instructions: { type: String, trim: true },
    },
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
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resident" }],
    isAvailable: { type: Boolean, default: true },
    dateCreated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// **Pre-Save Middleware to Prevent Negative Values**
jobSchema.pre("save", function (next) {
  if (this.availablePositions < 0) {
    return next(new Error("Available positions cannot be negative"));
  }
  next();
});

const Jobs = mongoose.model("jobs", jobSchema);
module.exports = Jobs;
