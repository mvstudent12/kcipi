const Admin = require("../models/Admin");
const Facility_Management = require("../models/Facility_Management");
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
      res.render("error/500");
    }
  },
  //edits resident information
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
    const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

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
        const updateData = {
          $set: {
            [`${dept}Clearance.status`]: "approved",
            "workEligibility.status": "pending",
          },
          $push: {
            [`${dept}Clearance.clearanceHistory`]: {
              action: "approved",
              performedBy: name,
              reason: "Clearance approved",
            },
          },
        };

        // Only push to notes if comments are not empty
        if (comments) {
          updateData.$push[`${dept}Clearance.notes`] = {
            createdAt: new Date(),
            createdBy: name,
            note: comments,
          };
        }
        await Resident.updateOne({ residentID: residentID }, updateData);
      } else if (clearance === "false") {
        const updateData = {
          $set: {
            [`${dept}Clearance.status`]: "restricted",
            "workEligibility.status": "restricted",
          },
          $push: {
            [`${dept}Clearance.clearanceHistory`]: {
              action: "restricted",
              performedBy: name,
              reason: "Clearance restricted",
            },
          },
        };

        // Only push to notes if comments are not empty
        if (comments) {
          updateData.$push[`${dept}Clearance.notes`] = {
            createdAt: new Date(),
            note: comments,
            createdBy: name,
          };
        }

        await Resident.updateOne({ residentID: residentID }, updateData);
      }
      const resident = await Resident.findOne({ residentID }).lean();

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

      // Dynamically create the key for the clearance field (e.g., MedicalClearance, UTMClearance)
      const clearanceKey = `${dept}Clearance`;

      // Check if the clearanceKey exists on the resident object
      if (!resident[clearanceKey]) {
        return res
          .status(404)
          .json({ message: `${dept} clearance not found.` }); // Handle case where the clearance field does not exist
      }

      // Check if there are notes in the clearance field
      const clearance = resident[clearanceKey];
      // if (!clearance.notes || clearance.notes.length === 0) {
      //   return res
      //     .status(404)
      //     .json({ message: `No notes found for ${dept} clearance.` }); // Handle case where no notes exist for the department
      // }

      // Retrieve the notes from the clearance field
      const notes = clearance.notes;

      // Send the notes in the response as JSON
      return res.status(200).json({ notes }); // Return the notes in the response body
    } catch (err) {
      console.error(err); // Log the error for debugging
      logger.warn("An error occurred while fetching the notes: " + err);
      return res.render("error/500");
    }
  },
  async addNotes(req, res) {
    try {
      const { residentID, dept } = req.params;
      const { notes } = req.body;
      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

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
      logger.warn("An error occurred while fetching the notes: " + err);
      return res.render("error/500");
    }
  },

  //approved resident's eligibility to work
  async approveEligibility(req, res) {
    const { residentID } = req.params;

    const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            "workEligibility.status": "approved", // Setting the status to approved
          },
          $push: {
            "workEligibility.clearanceHistory": {
              action: "approved",
              performedBy: name,
              reason: "Eligibility approved to work",
            },
            "workEligibility.notes": {
              note: `Work eligibility granted by ${name}.`,
              createdAt: new Date(),
              createdBy: name,
            },
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
    const { rejectReason } = req.body;
    const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

    try {
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            "workEligibility.status": "restricted", // Setting the status to restricted
          },
          $push: {
            "workEligibility.clearanceHistory": {
              action: "restricted",
              performedBy: name,
              reason: rejectReason,
            },
            "workEligibility.notes": {
              note: `Work eligibility restricted by ${name} for ${rejectReason}`,
              createdAt: new Date(),
              createdBy: name,
            },
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
      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;
      const { startDate, notes } = req.body;

      //update resident object with hiring info
      await Resident.findByIdAndUpdate(id, {
        $set: {
          isHired: true,
          dateHired: startDate,
          companyName,
        },
      });
      const resident = await Resident.findById(id).lean();
      const residentID = resident.residentID;

      // //remove user from applicants/ interviews add to workforce
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

      // //find positions resident has applied for
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
      const { terminationReason, workRestriction, notes } = req.body;

      const resInfo = await Resident.findById(id).lean();
      const dateHired = resInfo.dateHired;
      const companyName = resInfo.companyName;
      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

      const updateData = {
        $set: {
          isHired: false,
          companyName: "",
          dateHired: null,
          "workEligibility.status": workRestriction,
        },
      };

      // Construct the workHistory object
      const workHistoryEntry = {
        companyName: companyName,
        startDate: dateHired ? new Date(dateHired) : null,
        endDate: new Date(),
        reasonForLeaving: terminationReason || "",
      };

      // If notes exist, add them as an array inside workHistory
      if (notes) {
        workHistoryEntry.note = {
          createdAt: new Date(),
          createdBy: name,
          note: notes,
        };
      }

      // Push the workHistory entry into the array
      updateData.$push = { workHistory: workHistoryEntry };

      // Perform the update
      await Resident.updateOne({ _id: id }, updateData);

      const resident = await Resident.findById(id).lean();

      //remove employees from Jobs DB
      await Jobs.findOneAndUpdate(
        { employees: id }, // Find the job where id exists in employees
        { $pull: { employees: id } } // Remove the residentID from the employees array
      ).lean();

      // //find positions resident has applied for
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
};
