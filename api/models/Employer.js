const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const employerSchema = new Schema({
  firstName: {
    type: String,
    lowercase: true,
    trim: true,
  },
  lastName: {
    type: String,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true, // Ensures no duplicates
    required: [true, "Please enter email"],
    lowercase: true,
    index: true, // Index is good if querying often by email
  },
  password: {
    type: String,
    required: [true, "Please enter password"],
  },
  role: {
    type: String,
    default: "employer",
    lowercase: true,
  },
  facility: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
    index: true, // Index for facility
  },
  companyName: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
    index: true, // Index for faster querying by companyName
  },
});

// Hash the password before saving
employerSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

// Create the model with the correct capitalization
const Employer = mongoose.model("Employer", employerSchema);

module.exports = Employer;
