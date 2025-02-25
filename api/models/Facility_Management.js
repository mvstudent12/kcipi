const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const facility_managementSchema = new Schema({
  role: {
    type: String,
    default: "facility_management",
  },
  firstName: {
    type: String,
    lowercase: true,
  },
  lastName: {
    type: String,
    lowercase: true,
  },
  facility: {
    type: String,
    lowercase: true,
  },
  email: {
    type: String,
    unique: true,
    required: [true, "Please enter email"],
    lowercase: true,
    validate: {
      validator: (v) => /^\S+@\S+\.\S+$/.test(v),
      message: "Please enter a valid email",
    },
  },
  password: {
    type: String,
    required: [true, "Please enter password"],
  },
});

// Hash the password before saving
facility_managementSchema.pre("save", async function (next) {
  // Hash password if it's new or modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

const Facility_Management = mongoose.model(
  "facility_management",
  facility_managementSchema
);
module.exports = Facility_Management;
