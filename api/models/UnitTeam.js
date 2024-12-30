const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

const unitTeamSchema = new Schema({
  role: {
    type: String,
    default: "unitTeam",
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
  },
  password: {
    type: String,
    required: [true, "Please enter password"],
  },
});

// Hash the password before saving
unitTeamSchema.pre("save", async function (next) {
  // Hash password if it's new or modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

//static method to find unit team user
unitTeamSchema.statics.findUnitTeam = async function (email) {
  const user = await this.find({ email: email }).lean();
  if (user) {
    return user;
  }
  throw Error("something went wrong");
};

//static method to login unit team user
unitTeamSchema.statics.logIn = async function (email, password) {
  const user = await this.findOne({ email });
  if (user) {
    const auth = await bcrypt.compare(password, user.password);
    if (auth) {
      return user;
    }
    throw Error("incorrect password");
  }
  throw Error("This email does not exist");
};

const UnitTeam = mongoose.model("unitTeam", unitTeamSchema);
module.exports = UnitTeam;
