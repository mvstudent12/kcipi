const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const jobSchema = new Schema({
  companyID: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  companyName: { type: String, lowercase: true, trim: true },
  position: { type: String, lowercase: true, trim: true },
  facility: { type: String, lowercase: true, trim: true },
  availablePositions: { type: Number, default: 0 },
  description: { type: String, lowercase: true, trim: true },
  skillSet: { type: String, lowercase: true, trim: true },
  pay: { type: String, lowercase: true, trim: true },
  jobPool: { type: String, lowercase: true, trim: true },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resident" }],
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resident" }],
  isAvailable: { type: Boolean, default: true },
  dateCreated: { type: Date, default: Date.now },

  interviews: [
    {
      isRequested: { type: Boolean, default: false },
      preferredDate: { type: String, trim: true },
      employerInstructions: { type: String, trim: true },
      dateRequested: { type: Date, required: true },
      residentID: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      date: { type: Date, required: true },
      time: { type: String, required: true }, // Store time as a string in HH:mm or other formats
      instructions: { type: String, trim: true },
    },
  ],
});

const Jobs = mongoose.model("jobs", jobSchema);
module.exports = Jobs;
