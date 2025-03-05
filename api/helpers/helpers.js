// helpers.js
const moment = require("moment");
const mongoose = require("mongoose");

const helpers = {
  countArrayItems: (array) => {
    if (!array) {
      return 0;
    }
    return array.length;
  },

  add: (value, increment) => {
    return value + increment;
  },

  countItems: (array) => {
    return Array.isArray(array) ? array.length : 0;
  },
  eq: (a, b) => {
    if (typeof a === "string" && typeof b === "string") {
      return a.toLowerCase() === b.toLowerCase();
    } else return a == b;
  },
  formatDate: (date) => {
    return moment(date).format("MM/D/YY");
  },

  json: (context) => {
    return JSON.stringify(context);
  },

  getApplication: (resident_id, applicants, options) => {
    if (Array.isArray(applicants)) {
      // Convert resident_id to ObjectId if it's not already
      const residentObjectId = new mongoose.Types.ObjectId(resident_id);

      // Find the specific applicant in the array by matching resident_id
      const application = applicants.find(
        (application) =>
          application.resident_id.toString() === residentObjectId.toString()
      );

      if (application) {
        return options.fn(application); // Return the application to the template
      }
    }

    // Return the inverse block if no match is found
    return options.inverse(this);
  },
};

module.exports = helpers;
