//database requests
const Admin = require("../models/Admin");
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
} = require("../utils/emailUtils/notificationEmail");

module.exports = {
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
      res.status(500).send("An error occurred while requesting the interview.");
    }
  },
  async reviewInterviewRequest(req, res) {
    try {
      const { interviewID, email } = req.params;
      console.log(email);

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
      console.log(interview);
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
      res.status(500).send("An error occurred while scheduling the interview.");
    }
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
  //   Medical Clearance
  //========================

  async approveMedical(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            MedicalClearance: true,
            MedicalClearanceDate: new Date(),
            MedicalClearedBy: email,
            MedicalReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();

    res.render("clearance/Medical", { resident, email, activeTab });
  },
  async removeMedicalClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            MedicalClearance: false,
            MedicalClearanceRemovedDate: new Date(),
            MedicalClearanceRemovedBy: email,
            MedicalReviewed: false,
            MedicalRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Medical", { resident, email, activeTab });
  },
  async removeMedicalRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            MedicalClearance: false,
            MedicalReviewed: false,
            MedicalRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Medical", { resident, email, activeTab });
  },

  async denyMedicalClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            MedicalClearance: false,
            MedicalRestrictionDate: new Date(),
            MedicalRestrictedBy: email,
            MedicalRestriction: true,
            MedicalReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Medical", { resident, email, activeTab });
  },
  async saveMedicalNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            MedicalNotes: {
              note: notes,
              createdAt: new Date(),
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Medical", { resident, email, activeTab });
  },
  //========================
  //   UTM Clearance
  //========================

  async approveUTM(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            UTMClearance: true,
            UTMClearanceDate: new Date(),
            UTMClearedBy: email,
            UTMReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();

    res.render("clearance/UTM", { resident, email, activeTab });
  },
  async removeUTMClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            UTMClearance: false,
            UTMClearanceRemovedDate: new Date(),
            UTMClearanceRemovedBy: email,
            UTMReviewed: false,
            UTMRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/UTM", { resident, email, activeTab });
  },
  async removeUTMRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            UTMClearance: false,
            UTMReviewed: false,
            UTMRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/UTM", { resident, email, activeTab });
  },

  async denyUTMClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            UTMClearance: false,
            UTMRestrictionDate: new Date(),
            UTMRestrictedBy: email,
            UTMRestriction: true,
            UTMReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/UTM", { resident, email, activeTab });
  },
  async saveUTMNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            UTMNotes: {
              note: notes,
              createdAt: new Date(),
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/UTM", { resident, email, activeTab });
  },
  //========================
  //   EAI Clearance
  //========================

  async approveEAI(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            EAIClearance: true,
            EAIClearanceDate: new Date(),
            EAIClearedBy: email,
            EAIReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/EAI", { resident, email, activeTab });
  },
  async removeEAIClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            EAIClearance: false,
            EAIClearanceRemovedDate: new Date(),
            EAIClearanceRemovedBy: email,
            EAIReviewed: false,
            EAIRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/EAI", { resident, email, activeTab });
  },
  async removeEAIRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            EAIClearance: false,
            EAIReviewed: false,
            EAIRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/EAI", { resident, email, activeTab });
  },

  async denyEAIClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            EAIClearance: false,
            EAIRestrictionDate: new Date(),
            EAIRestrictedBy: email,
            EAIRestriction: true,
            EAIReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/EAI", { resident, email, activeTab });
  },
  async saveEAINotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            EAINotes: {
              note: notes,
              createdAt: new Date(),
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();

    res.render("clearance/EAI", { resident, email, activeTab });
  },
  //========================
  //   Classification Clearance
  //========================

  async approveClassification(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            ClassificationClearance: true,
            ClassificationClearanceDate: new Date(),
            ClassificationClearedBy: email,
            ClassificationReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Classification", { resident, email, activeTab });
  },
  async removeClassificationClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            ClassificationClearance: false,
            ClassificationClearanceRemovedDate: new Date(),
            ClassificationClearanceRemovedBy: email,
            ClassificationReviewed: false,
            ClassificationRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Classification", { resident, email, activeTab });
  },
  async removeClassificationRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            ClassificationClearance: false,
            ClassificationReviewed: false,
            ClassificationRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Classification", { resident, email, activeTab });
  },

  async denyClassificationClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            ClassificationClearance: false,
            ClassificationRestrictionDate: new Date(),
            ClassificationRestrictedBy: email,
            ClassificationRestriction: true,
            ClassificationReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Classification", { resident, email, activeTab });
  },
  async saveClassificationNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            ClassificationNotes: {
              note: notes,
              createdAt: new Date(),
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();

    res.render("clearance/Classification", { resident, email, activeTab });
  },
  //========================
  //   DW Clearance
  //========================

  async approveDW(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            DWClearance: true,
            DWClearanceDate: new Date(),
            DWClearedBy: email,
            DWReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();

    res.render("clearance/Deputy-Warden", { resident, email, activeTab });
  },
  async removeDWClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            DWClearance: false,
            DWClearanceRemovedDate: new Date(),
            DWClearanceRemovedBy: email,
            DWReviewed: false,
            DWRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Deputy-Warden", { resident, email, activeTab });
  },
  async removeDWRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            DWClearance: false,
            DWReviewed: false,
            DWRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Deputy-Warden", { resident, email, activeTab });
  },

  async denyDWClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            DWClearance: false,
            DWRestrictionDate: new Date(),
            DWRestrictedBy: email,
            DWRestriction: true,
            DWReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Deputy-Warden", { resident, email, activeTab });
  },
  async saveDWNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            DWNotes: {
              note: notes,
              createdAt: new Date(),
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Deputy-Warden", { resident, email, activeTab });
  },
  //========================
  //   Warden Clearance
  //========================

  async approveWarden(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            WardenClearance: true,
            WardenClearanceDate: new Date(),
            WardenClearedBy: email,
            WardenReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Warden", { resident, email, activeTab });
  },
  async removeWardenClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            WardenClearance: false,
            WardenClearanceRemovedDate: new Date(),
            WardenClearanceRemovedBy: email,
            WardenReviewed: false,
            WardenRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Warden", { resident, email, activeTab });
  },
  async removeWardenRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            WardenClearance: false,
            WardenReviewed: false,
            WardenRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Warden", { resident, email, activeTab });
  },

  async denyWardenClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            WardenClearance: false,
            WardenRestrictionDate: new Date(),
            WardenRestrictedBy: email,
            WardenRestriction: true,
            WardenReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Warden", { resident, email, activeTab });
  },
  async saveWardenNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            WardenNotes: {
              note: notes,
              createdAt: new Date(),
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();

    res.render("clearance/Warden", { resident, email, activeTab });
  },

  //========================
  //   Sex-Offender Clearance
  //========================

  async approveSexOffender(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            sexOffenderClearance: true,
            sexOffenderClearanceDate: new Date(),
            sexOffenderClearedBy: email,
            sexOffenderReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Sex-Offender", { resident, email, activeTab });
  },
  async removeSexOffenderClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            sexOffenderClearance: false,
            sexOffenderClearanceRemovedDate: new Date(),
            sexOffenderClearanceRemovedBy: email,
            sexOffenderReviewed: false,
            sexOffenderRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Sex-Offender", { resident, email, activeTab });
  },
  async removeSexOffenderRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            sexOffenderClearance: false,
            sexOffenderReviewed: false,
            sexOffenderRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Sex-Offender", { resident, email, activeTab });
  },

  async denySexOffenderClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            sexOffenderClearance: false,
            sexOffenderRestrictionDate: new Date(),
            sexOffenderRestrictedBy: email,
            sexOffenderRestriction: true,
            sexOffenderReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Sex-Offender", { resident, email, activeTab });
  },
  async saveSexOffenderNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            sexOffenderNotes: {
              note: notes,
              createdAt: new Date(),
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();

    res.render("clearance/Sex-Offender", { resident, email, activeTab });
  },

  //========================
  // Victim-Services Clearance
  //========================

  async approveVictimServices(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            victimServicesClearance: true,
            victimServicesClearanceDate: new Date(),
            victimServicesClearedBy: email,
            victimServicesReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Victim-Services", { resident, email, activeTab });
  },
  async removeVictimServicesClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            victimServicesClearance: false,
            victimServicesClearanceRemovedDate: new Date(),
            victimServicesClearanceRemovedBy: email,
            victimServicesReviewed: false,
            victimServicesRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Victim-Services", { resident, email, activeTab });
  },
  async removeVictimServicesRestriction(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            victimServicesClearance: false,
            victimServicesReviewed: false,
            victimServicesRestriction: false,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Victim-Services", { resident, email, activeTab });
  },

  async denyVictimServicesClearance(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            victimServicesClearance: false,
            victimServicesRestrictionDate: new Date(),
            victimServicesRestrictedBy: email,
            victimServicesRestriction: true,
            victimServicesReviewed: true,
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    activeTab = "status";
    const resident = await Resident.findOne({ residentID }).lean();
    res.render("clearance/Victim-Services", { resident, email, activeTab });
  },
  async saveVictimServicesNotes(req, res) {
    const residentID = req.params.residentID;
    const email = req.params.email;
    const notes = req.body.notes;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            victimServicesNotes: {
              note: notes,
              createdAt: new Date(),
            },
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
    const activeTab = "notes";
    const resident = await Resident.findOne({ residentID }).lean();

    res.render("clearance/Victim-Services", { resident, email, activeTab });
  },
  //===========================
  //     All Notifications
  //===========================
  //request clearance from Medical, eai etc through email
  async requestClearance(req, res) {
    const { recipient, comments } = req.body;
    const { residentID, category } = req.params;
    const sender = req.session.user.email;

    try {
      const resident = await Resident.findOne({ residentID }).lean();
      sendReviewEmail(resident, category, recipient, sender, comments);
      res.status(200).json({ message: "Request Sent" });
    } catch (err) {
      console.log(errors);
      //add more elegant error handling functionality later
      //add const errors = handleErrors(err);
      //res.status(400).json({ errors });
      res.status(400).json({ message: "Request Failed" });
    }
  },
  async reviewClearance(req, res) {
    const { residentID, email, dept } = req.params;
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
    const residentID = req.params.residentID;
    const email = req.params.email;
    const department = req.body.category;
    const recipient = req.body.recipientEmail;
    const notes = req.body.comments;
    const resident = await Resident.findOne({ residentID }).lean();

    sendReviewEmail(resident, department, recipient, email, notes);
    res.render("clearance/thankYou", { resident, email });
  },
};
