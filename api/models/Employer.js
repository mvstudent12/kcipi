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
    unique: true,
    required: [true, "Please enter email"],
    lowercase: true,
    index: true,
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
    index: true,
  },

  companyName: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
    index: true,
  },
});

// Hash the password before saving
employerSchema.pre("save", async function (next) {
  // Hash password if it's new or modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

const Employer = mongoose.model("employer", employerSchema);
module.exports = Employer;
