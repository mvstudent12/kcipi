// helpers.js
const moment = require("moment");

const helpers = {
  countArrayItems: (array) => {
    if (!array) {
      return 0;
    }
    return array.length;
  },
  countPendingItems: (array, x, y) => {
    let count = 0;
    array.forEach((item) => {
      const condition1 = item[x];
      const condition2 = item[y];

      if ((condition1 && !condition2) || (!condition1 && condition2)) {
        count++;
      }
    });

    return count;
  },
  add: (value, increment) => {
    return value + increment;
  },
  countNestedTrue: (array, key) => {
    if (!Array.isArray(array)) return 0;
    return array.filter(
      (item) =>
        item[key] === true ||
        item[key] === "inappropriate" ||
        item[key] === "inaccurate"
    ).length;
  },
  countNestedFalse: (array, key) => {
    if (!Array.isArray(array)) return 0;
    return array.filter((item) => item[key] === false).length;
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
  isResidentInInterviews: (residentID, interviews) => {
    if (
      Array.isArray(interviews) &&
      interviews.some((interview) => interview.residentID === residentID)
    ) {
      return true;
    } else {
      return false;
    }
  },
  getInterview: (residentID, interviews, options) => {
    if (Array.isArray(interviews)) {
      const interview = interviews.find(
        (interview) => interview.residentID === residentID
      );
      if (interview) {
        return options.fn(interview);
      }
    }
    return options.inverse(this);
  },
  json: (context) => {
    return JSON.stringify(context);
  },
};

module.exports = helpers;
