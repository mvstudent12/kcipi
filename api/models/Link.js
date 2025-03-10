const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const linkSchema = new Schema({
  email: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(v); // simple email regex
      },
      message: (props) => `${props.value} is not a valid email!`,
    },
  },
  token: {
    type: String,
    required: true,
    unique: true, // Ensure that the token is unique
  },
  tokenExpiration: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false, // Track if the token has been used
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Link = mongoose.model("Link", linkSchema);

module.exports = Link;
