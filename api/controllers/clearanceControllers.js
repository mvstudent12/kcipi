const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

const mongoose = require("mongoose");

module.exports = {
  //serves non-resident dashboard from login portal portal
  async dashboard(req, res) {
    try {
      const residents = await Resident.find().lean();

      res.render(`${req.session.user.role}/dashboard`, {
        residents,
        user: req.session.user,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //serves resident profile with their resume
  async residentProfile(req, res) {
    try {
      const { residentID } = req.params;

      // Find the resident based on residentID
      const resident = await Resident.findOne({ residentID }).lean();
      if (!resident) {
        return res.status(404).send("Resident not found"); // Handling case when resident is not found
      }

      const id = resident._id;

      // Find positions the resident has applied for
      const applications = await Jobs.find({
        "applicants.resident_id": id, // Match applicants by resident ID in the applicants array
      }).lean();

      // Fetch the unit team, sorted by firstName
      const unitTeam = await UnitTeam.find({}).sort({ firstName: 1 }).lean();

      const activeTab = "overview"; // Set the active tab for the profile

      // Render the profile page
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        applications,
        activeTab,
        unitTeam,
      });
    } catch (err) {
      console.error("Error fetching resident profile:", err);
      res.status(500).send("An error occurred while fetching the profile.");
    }
  },
  async editResident(req, res) {
    try {
      let { residentID, custodyLevel, facility, unitTeamInfo, jobPool } =
        req.body;

      let [unitTeamEmail, unitTeamName] = unitTeamInfo.split("|");

      await Resident.updateOne(
        { residentID: residentID }, // Find the resident by ID
        {
          $set: {
            facility: facility,
            unitTeam: unitTeamName,
            custodyLevel: custodyLevel,
            jobPool: jobPool,
            "resume.unitTeam": unitTeamEmail,
          },
        }
      );
      const resident = await Resident.findOne({ residentID }).lean();

      const id = resident._id;

      //find positions resident has applied for
      const applications = await Jobs.find({
        "applicants.resident_id": id, // Match the resident_id field inside the applicants array
      }).lean();

      const unitTeam = await UnitTeam.find({}).sort({ firstName: 1 }).lean();

      const activeTab = "overview";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        applications,
        activeTab,
        unitTeam,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //rejects resident resume
  async rejectResume(req, res) {
    const residentID = req.params.id;
    const rejectReason = req.body.rejectReason;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            resumeIsApproved: false,
            resumeIsComplete: false,
            resumeRejectionReason: rejectReason,
          },
        }
      );
      const resident = await Resident.findOne({ residentID }).lean();
      const activeTab = "resume";

      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
      });
    } catch (err) {
      console.error(err);
    }
  },
  //approves resident resume
  async approveResume(req, res) {
    const residentID = req.params.id;
    const jobPool = req.body.jobPool;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            resumeIsApproved: true,
            jobPool: jobPool,
          },
        }
      );

      const saveMsg = "This resume has been approved.";
      const resident = await Resident.findOne({ residentID }).lean();
      const activeTab = "resume";

      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
        saveMsg,
      });
    } catch (err) {
      console.error(err);
    }
  },
  //edits residents clearance values for eligibility
  async editClearance(req, res) {
    let { residentID, dept } = req.params;
    const { clearance, comments } = req.body;
    console.log(req.body);
    console.log(req.params);
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
      if (clearance === "true") {
        await Resident.updateOne(
          { residentID: residentID },
          {
            $set: {
              [`${dept}Reviewed`]: true,
              [`${dept}Clearance`]: true,
              [`${dept}ClearanceDate`]: new Date(),
              [`${dept}ClearedBy`]: req.session.user._id,
            },
            $push: {
              [`${dept}Notes`]: { createdAt: new Date(), note: comments },
            },
          }
        );
      } else if (clearance === "false") {
        await Resident.updateOne(
          { residentID: residentID },
          {
            $set: {
              [`${dept}Reviewed`]: true,
              [`${dept}Clearance`]: false,
              [`${dept}ClearanceRemovedDate`]: new Date(),
              [`${dept}ClearanceRemovedBy`]: req.session.user._id,
              [`${dept}Restriction`]: true,
              [`${dept}RestrictionDate`]: new Date(),
              [`${dept}RestrictedBy`]: req.session.user._id,
              isEligibleToWork: false,
            },
            $push: {
              [`${dept}Notes`]: { createdAt: new Date(), note: comments },
            },
          }
        );
      }

      const resident = await Resident.findOne({ residentID }).lean();
      console.log(resident);
      const activeTab = "clearance";

      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
      });
    } catch (err) {
      console.error(err);
    }
  },
  async findNotes(req, res) {
    try {
      const { residentID, dept } = req.params;
      // Find the resident by residentID
      const resident = await Resident.findOne({ residentID }).lean();

      if (!resident) {
        return res.status(404).json({ message: "Resident not found." }); // Handle case where resident is not found
      }

      // Dynamically create the key for the notes
      const notesKey = `${dept}Notes`;
      console.log(notesKey);

      // Check if the notesKey exists on the resident object
      if (!resident[notesKey]) {
        return res.status(404).json({ message: `No notes found for ${dept}.` }); // Handle case where no notes exist for the department
      }

      // Retrieve the notes from the resident object
      const notes = resident[notesKey];

      // Send the notes in the response as JSON
      return res.status(200).json({ notes }); // Return the notes in the response body
    } catch (err) {
      console.error(err); // Log the error for debugging
      return res
        .status(500)
        .json({ message: "An error occurred while fetching the notes." }); // Handle server errors
    }
  },
  async addNotes(req, res) {
    try {
      console.log(req.body); // This will log the route parameters

      const { residentID, dept } = req.params;

      const { notes } = req.body;

      await Resident.updateOne(
        { residentID: residentID },
        {
          $push: {
            [`${dept}Notes`]: { createdAt: new Date(), note: notes },
          },
        }
      );
      // Find the resident based on residentID
      const resident = await Resident.findOne({ residentID }).lean();
      if (!resident) {
        return res.status(404).send("Resident not found"); // Handling case when resident is not found
      }

      const id = resident._id;

      // Find positions the resident has applied for
      const applications = await Jobs.find({
        "applicants.resident_id": id, // Match applicants by resident ID in the applicants array
      }).lean();

      // Fetch the unit team, sorted by firstName
      const unitTeam = await UnitTeam.find({}).sort({ firstName: 1 }).lean();

      const activeTab = "clearance"; // Set the active tab for the profile

      // Render the profile page
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        applications,
        activeTab,
        unitTeam,
      });
    } catch (err) {
      console.error(err); // Log the error for debugging
      return res
        .status(500)
        .json({ message: "An error occurred while fetching the notes." }); // Handle server errors
    }
  },

  //approved resident's eligibility to work
  async approveEligibility(req, res) {
    const { residentID } = req.params;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            isEligibleToWork: true,
            eligibilityApprovedBy: req.session.user._id,
            isRestrictedFromWork: false,
          },
        }
      );
      const resident = await Resident.findOne({ residentID }).lean();

      const eligibleMsg = "This resident is approved and eligible for work.";
      const activeTab = "clearance";

      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
        eligibleMsg,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //denies resident's eligibility to work
  async rejectEligibility(req, res) {
    const { residentID } = req.params;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            isEligibleToWork: false,
            isRestrictedFromWork: true,
            eligibilityRestrictedBy: req.session.user._id,
            eligibilityRestrictionReason: req.body.rejectReason,
          },
        }
      );

      const resident = await Resident.findOne({ residentID }).lean();

      const activeTab = "clearance";

      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
      });
    } catch (err) {
      console.log(err);
    }
  },

  async scheduleInterview(req, res) {
    try {
      const { jobID } = req.params;
      const { residentID, date, time, instructions } = req.body;

      const resident = await Resident.findOne({ residentID }).lean();
      const id = resident._id;
      const name = `${resident.firstName} ${resident.lastName}`;

      if (req.body.interviewID) {
        const { interviewID } = req.body;
        await Jobs.updateOne(
          {
            _id: new mongoose.Types.ObjectId(jobID), // Ensure jobID is an ObjectId
            "interviews._id": new mongoose.Types.ObjectId(interviewID), // Ensure interviewID is an ObjectId
          },
          {
            $set: {
              "interviews.$.dateScheduled": date, // Update the date
              "interviews.$.time": time, // Update the time
              "interviews.$.instructions": instructions, // Update the instructions
            },
          }
        );
      } else {
        // //add interview to Jobs document
        await Jobs.findByIdAndUpdate(
          new mongoose.Types.ObjectId(jobID), // Ensure jobID is an ObjectId
          {
            $push: {
              interviews: {
                isRequested: true,
                dateRequested: new Date(), // Automatically set request date
                residentID,
                name,
                dateScheduled: date, // Ensure correct field name
                time,
                instructions,
              },
            },
          },
          { new: true } // Returns the updated document (optional)
        );
      }

      //find positions resident has applied for
      const applications = await Jobs.find({
        "applicants.resident_id": id, // Match the resident_id field inside the applicants array
      }).lean();

      const activeTab = "application";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //employs resident to company
  async hireResident(req, res) {
    try {
      const { id, jobID } = req.params;
      const position = await Jobs.findOne({ _id: jobID }).lean();
      const companyName = position.companyName;

      await Resident.findByIdAndUpdate(id, {
        $set: {
          isHired: true,
          dateHired: new Date(),
          companyName,
        },
      });
      const resident = await Resident.findById(id).lean();
      const residentID = resident.residentID;

      //remove user from applicants/ interviews add to workforce
      await Jobs.findByIdAndUpdate(jobID, {
        $pull: {
          applicants: { resident_id: id }, // Remove resident from the applicants array
          interviews: { residentID: residentID }, // Remove interview with the given residentID
        },
        $push: {
          employees: id, // Add the resident to the employees array
        },
        $inc: {
          availablePositions: -1, // Subtract 1 from availablePositions
        },
      });

      //remove resident from all other applied jobs
      await Jobs.updateMany(
        {}, // This empty filter matches all documents
        {
          $pull: {
            applicants: { resident_id: id }, // Remove resident_id from the applicants array
            interviews: { residentID: residentID }, // Remove interview with the given residentID
          },
        }
      );

      //find positions resident has applied for
      const applications = await Jobs.find({
        "applicants.resident_id": id, // Match the resident_id field inside the applicants array
      }).lean();

      const activeTab = "application";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //employs resident to company
  async rejectHire(req, res) {
    try {
      const { id, jobID } = req.params;
      const position = await Jobs.findOne({ _id: jobID }).lean();
      const companyName = position.companyName;

      await Resident.findByIdAndUpdate(id, {
        $set: {
          isHired: false,
        },
      });
      const resident = await Resident.findById(id).lean();
      const residentID = resident.residentID;

      //remove user from applicants/ interviews add to workforce
      await Jobs.findByIdAndUpdate(jobID, {
        $pull: {
          applicants: id,
          interviews: { residentID: residentID },
        },

        set: {
          isAvailable: {
            $cond: {
              if: { $eq: ["$availablePositions", 0] },
              then: false,
              else: "$isAvailable",
            },
          },
        },
      });

      //find positions resident has applied for
      const applications = await Jobs.find({
        "applicants.resident_id": id, // Match the resident_id field inside the applicants array
      }).lean();

      const activeTab = "application";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.log(err);
    }
  },
  //fires resident
  async terminateResident(req, res) {
    try {
      const { id } = req.params;

      await Resident.findByIdAndUpdate(id, {
        $set: {
          isHired: false,
          companyName: "",
          dateHired: null,
        },
      });
      const resident = await Resident.findById(id).lean();

      await Jobs.findOneAndUpdate(
        { employees: id }, // Find the job where id exists in employees
        { $pull: { employees: id } } // Remove the residentID from the employees array
      ).lean();

      //find positions resident has applied for
      const applications = await Jobs.find({
        "applicants.resident_id": id, // Match the resident_id field inside the applicants array
      }).lean();

      const activeTab = "application";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async requestHire(req, res) {
    try {
      console.log("hire requested");
    } catch (err) {
      console.log(err);
    }
  },
};
