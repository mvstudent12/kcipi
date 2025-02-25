const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const adminSchema = new Schema({
  role: {
    type: String,
    default: "admin",
  },
  firstName: {
    type: String,
    lowercase: true,
  },
  lastName: {
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
adminSchema.pre("save", async function (next) {
  // Hash password if it's new or modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

//static method to find admin user
adminSchema.statics.findAdmin = async function (email) {
  const user = await this.find({ email: email }).lean();
  if (user) {
    return user;
  }
  throw Error("something went wrong");
};

const Admin = mongoose.model("admin", adminSchema);
module.exports = Admin;
