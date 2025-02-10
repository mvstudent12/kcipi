//database requests
const Admin = require("../models/Admin");
const Facility_Management = require("../models/Facility_Management");
const Classification = require("../models/Classification");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

const mongoose = require("mongoose");

const {
  sendReviewEmail,
  sendHelpDeskEmail,
  sendContactEmail,
  sendRequestInterviewEmail,
  sendRequestHireEmail,
} = require("../utils/emailUtils/notificationEmail");
//===========================
//  Global   functions
//===========================
function getNameFromEmail(email) {
  const regex = /^([a-z]+)\.([a-z]+)@/i; // Matches "first.last@" pattern
  const match = email.match(regex);

  if (match) {
    const firstName = capitalize(match[1]);
    const lastName = capitalize(match[2]);
    return `${firstName} ${lastName}`;
  }
  return null;
}

function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

const getAllApplicantsByResidentID = async (jobID, resID) => {
  try {
    const job = await Jobs.findOne(
      { _id: jobID },
      { applicants: { $elemMatch: { resident_id: resID } } } // Returns all matching applicants
    );

    return job ? job.applicants : [];
  } catch (error) {
    console.error("Error fetching applicants:", error);
    throw error;
  }
};

module.exports = {
  //===========================
  //     All Notifications
  //===========================

  //request clearance from Medical, eai etc through email
  async requestClearance(req, res) {
    const { recipient, comments } = req.body;
    let { residentID, dept } = req.params;
    const sender = req.session.user.email;
    try {
      if (dept == "Sex-Offender") {
        dept = "sexOffender";
      }
      if (dept == "Victim-Services") {
        dept = "victimServices";
      }
      if (dept == "Deputy-Warden") {
        dept = "DW";
      }
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            [`${dept}Clearance.status`]: "pending",
            "workEligibility.status": "pending",
          },
        }
      );
      const resident = await Resident.findOne({ residentID }).lean();
      if (dept == "sexOffender") {
        dept = "Sex-Offender";
      }
      if (dept == "victimServices") {
        dept = "Victim-Services";
      }
      if (dept == "DW") {
        dept = "Deputy-Warden";
      }

      sendReviewEmail(resident, dept, recipient, sender, comments);
      dept = req.params.dept;
      const activeTab = "clearance";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
      });
    } catch (err) {
      console.log(err);
      //add more elegant error handling functionality later
      //add const errors = handleErrors(err);
      //res.status(400).json({ errors });
      res.status(400).json({ message: "Request Failed" });
    }
  },
  async reviewClearance(req, res) {
    let { residentID, email, dept } = req.params;
    if (dept == "Sex-Offender") {
      dept = "sexOffender";
    }
    if (dept == "Victim-Services") {
      dept = "victimServices";
    }
    if (dept == "Deputy-Warden") {
      dept = "DW";
    }
    try {
      const resident = await Resident.findOne({ residentID }).lean();
      const activeTab = "status";

      res.render(`clearance/${dept}`, { resident, email, activeTab });
    } catch (err) {
      console.error(err);
      console.log(err);
    }
  },
  async next_notes(req, res) {
    const { residentID, email, category } = req.params;

    const resident = await Resident.findOne({ residentID }).lean();
    const activeTab = "notes";
    res.render(`clearance/${category}`, { resident, email, activeTab });
  },
  async next_notify(req, res) {
    const { residentID, email, category } = req.params;
    const resident = await Resident.findOne({ residentID }).lean();
    const activeTab = "notify";
    res.render(`clearance/${category}`, { resident, email, activeTab });
  },

  async sendNextNotification(req, res) {
    const { residentID, email } = req.params;
    const department = req.body.category;
    const recipient = req.body.recipientEmail;
    const notes = req.body.comments;
    const resident = await Resident.findOne({ residentID }).lean();

    sendReviewEmail(resident, department, recipient, email, notes);
    res.render("clearance/thankYou", { resident, email });
  },
  async requestInterview(req, res) {
    try {
      let { residentID, preferences, additionalNotes } = req.body;
      const { jobID } = req.params;

      const resident = await Resident.findOne({ residentID }).lean();
      if (!resident) {
        throw new Error("Resident not found");
      }
      const residentObjectId = resident._id; // MongoDB ObjectId

      const name = `${resident.firstName} ${resident.lastName}`;
      const companyName = req.session.user.companyName;
      const sender = req.session.user.email;

      await Jobs.findByIdAndUpdate(jobID, {
        $push: {
          interviews: {
            isRequested: true,
            residentID,
            name,
            dateRequested: new Date(),
            preferredDate: preferences || null,
            employerInstructions: additionalNotes || "",
          },
        },
      });

      // Retrieve the updated job and return the _id of the last interview
      const updatedJob = await Jobs.findById(jobID).lean();
      if (!updatedJob || !updatedJob.interviews.length) {
        throw new Error("Interview request failed");
      }
      const interviewID =
        updatedJob.interviews[updatedJob.interviews.length - 1]._id;

      // find all jobs resident has applied for
      const applications = await Jobs.find({
        "applicants.resident_id": residentObjectId,
      }).lean();

      //send notification email to UTM
      let devEmail = "kcicodingdev@gmail.com";
      sendRequestInterviewEmail(
        resident,
        companyName,
        devEmail, //change to email in production
        sender,
        interviewID
      );

      const activeTab = "application";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.error("Error requesting interview:", err);
      logger.warn("An error occurred while requesting the interview: " + err);
      res.render("error/500");
    }
  },
  async reviewInterviewRequest(req, res) {
    try {
      const { interviewID, email } = req.params;

      let interview = await Jobs.aggregate([
        // Unwind the interviews array to make each interview a separate document
        { $unwind: "$interviews" },

        // Match the specific interview by its _id
        {
          $match: {
            "interviews._id": new mongoose.Types.ObjectId(interviewID),
          },
        },

        // Project the interview and optionally other relevant fields
        {
          $project: {
            _id: 0, // Exclude the Job document's _id
            position_id: "$_id", // Include the Job document's _id as jobID for context
            interview: "$interviews", // Include the matched interview
            companyName: "$companyName",
          },
        },
      ]);
      interview = interview[0];

      const residentID = interview.interview.residentID;
      const resident = await Resident.findOne({
        residentID: residentID,
      }).lean();

      res.render("clearance/requestInterview", {
        email,
        interview,
        resident,
      });
    } catch (err) {
      console.log(err);
    }
  }, //schedule interview from email notification
  async scheduleInterview(req, res) {
    try {
      const { interviewID, jobID } = req.params;
      const { date, time, instructions } = req.body;

      // Convert interviewID to ObjectId
      const interviewObjectId = new mongoose.Types.ObjectId(interviewID);

      //update the interview in job
      const result = await Jobs.updateOne(
        {
          _id: jobID, // Match the job by its ID
          "interviews._id": interviewObjectId, // Match the specific interview by its _id
        },
        {
          $set: {
            "interviews.$.dateScheduled": new Date(date), // Update the date
            "interviews.$.time": time, // Update the time
            "interviews.$.instructions": instructions.trim(), // Update the instructions
          },
        }
      );

      if (result.modifiedCount === 0) {
        throw new Error(
          "Interview update failed. Ensure job and interview exist."
        );
      }
      res.render(`clearance/thankYou`, {
        user: req.session.user,
      });
    } catch (err) {
      console.error("Error scheduling interview:", err);
      logger.warn("An error occurred while scheduling the interview: " + err);
      res.render("error/500");
    }
  },

  //========================
  //   Clearance Functions
  //========================
  async approveClearance(req, res) {
    let { residentID, email, dept } = req.params;

    if (dept == "Victim-Services") {
      dept = "victimServices";
    }
    const name = getNameFromEmail(email);

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            [`${dept}Clearance.status`]: "approved",
            "workEligibility.status": "pending",
          },
          $push: {
            [`${dept}Clearance.clearanceHistory`]: {
              action: "approved",
              performedBy: name,
              reason: "Clearance approved. ✅",
            },
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: name,
              note: `Approved clearance. ✅`,
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    console.log(dept);

    res.render(`clearance/${dept}`, { resident, email, activeTab });
  },
  async restrictClearance(req, res) {
    let { residentID, email, dept } = req.params;
    const name = getNameFromEmail(email);

    if (dept == "Victim-Services") {
      dept = "victimServices";
    }

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            [`${dept}Clearance.status`]: "restricted",
            "workEligibility.status": "restricted",
          },
          $push: {
            [`${dept}Clearance.clearanceHistory`]: {
              action: "restricted",
              performedBy: name,
              reason: "Restrictions added. ❌",
            },
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: name,
              note: `Restricted clearance. ❌`,
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
      res.render("errors/500");
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    console.log(resident);
    res.render(`clearance/${dept}`, { resident, email, activeTab });
  },
  async saveNotes(req, res) {
    let { residentID, email, dept } = req.params;

    if (dept == "Sex-Offender") {
      dept = "sexOffender";
    }
    if (dept == "Victim-Services") {
      dept = "victimServices";
    }
    if (dept == "Deputy-Warden") {
      dept = "DW";
    }
    const { notes } = req.body;
    let name = getNameFromEmail(email);

    if (!name) {
      name = email;
    }
    console.log(name);
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: name,
              note: notes,
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
      res.render("errors/500");
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render(`clearance/${dept}`, { resident, email, activeTab });
  },

  //========================
  //   Help Desk
  //========================
  async helpDesk(req, res) {
    const { name, email, subject, message } = req.body;
    const recipient = "kcicodingdev@gmail.com";
    try {
      sendHelpDeskEmail(name, subject, email, message, recipient);
      const sentMsg = true;
      res.render(`${req.session.user.role}/helpDesk`, {
        user: req.session.user,
        sentMsg,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //========================
  //   Contact
  //========================
  async contact(req, res) {
    const { name, email, subject, message } = req.body;
    const recipient = "kcicodingdev@gmail.com";
    try {
      sendContactEmail(name, subject, email, message, recipient);
      const sentMsg = true;
      res.render(`${req.session.user.role}/contact`, {
        user: req.session.user,
        sentMsg,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //========================
  //   Thank you
  //========================
  async thankYou(req, res) {
    res.render("clearance/thankYou");
  },
};
