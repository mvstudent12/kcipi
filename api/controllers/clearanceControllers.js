const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");

const mongoose = require("mongoose");

const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
  getResidentProfileInfo,
} = require("../utils/clearanceUtils");

const { getUserNotifications } = require("../utils/notificationUtils");
const { createActivityLog } = require("../utils/activityLogUtils");

module.exports = {
  //serves non-resident dashboard from login portal
  async dashboard(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const residents = await Resident.find({ isActive: true })
        .sort({ lastName: 1 })
        .lean();

      res.render(`${req.session.user.role}/dashboard`, {
        residents,
        user: req.session.user,
        notifications,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async recentActivities(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const id = req.session.user._id.toString();

      const activities = await ActivityLog.find({ userID: id })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

      res.render(`${req.session.user.role}/recentActivities`, {
        user: req.session.user,
        notifications,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //serves resident profile with their resume
  async residentProfile(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { residentID } = req.params;

      const { resident, applications, unitTeam, activities } =
        await getResidentProfileInfo(residentID);

      const activeTab = "overview"; // Set the active tab for the profile
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        applications,
        activeTab,
        unitTeam,
        activities,
      });
    } catch (err) {
      console.error("Error fetching resident profile:", err);
      res.render("error/403");
    }
  },
  //edits resident information
  async editResident(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
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

      const { resident, applications, unitTeam, activities, res_id } =
        await getResidentProfileInfo(residentID);

      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited resident #${residentID}.`
      );

      const activeTab = "overview";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        applications,
        activeTab,
        unitTeam,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //rejects resident resume
  async rejectResume(req, res) {
    try {
      const { residentID } = req.params;
      const { rejectReason } = req.body;

      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      await Resident.updateOne(
        { residentID: residentID },
        {
          $set: {
            "resume.status": "rejected",
            "resume.rejectionReason": rejectReason,
            resumeIsComplete: false,
          },
        }
      );

      const { resident, applications, unitTeam, activities, res_id } =
        await getResidentProfileInfo(residentID);

      await createActivityLog(
        req.session.user._id.toString(),
        "resume_rejected",
        `Rejected resume for resident #${residentID} for being ${rejectReason}.`
      );

      await createActivityLog(
        res_id.toString(),
        "resume_rejected",
        `Resume rejected by Unit Team for being ${rejectReason}.`
      );

      const activeTab = "resume";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
        notifications,
        unitTeam,
        activities,
        applications,
      });
    } catch (err) {
      console.error(err);
    }
  },
  //approves resident resume
  async approveResume(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { residentID } = req.params;
      const { jobPool } = req.body;
      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

      await Resident.updateOne(
        { residentID },
        {
          $set: {
            "resume.status": "approved",
            "resume.approvedBy": name,
            "resume.approvalDate": new Date(),
            jobPool: jobPool,
          },
        }
      );

      const { resident, applications, unitTeam, activities, res_id } =
        await getResidentProfileInfo(residentID);

      await createActivityLog(
        req.session.user._id.toString(),
        "resume_approved",
        `Approved resume for resident #${residentID}.`
      );
      await createActivityLog(
        res_id.toString(),
        "resume_approved",
        `Resume approved by Unit Team.`
      );

      const saveMsg = "This resume has been approved.";
      const activeTab = "resume";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
        notifications,
        saveMsg,
        unitTeam,
        activities,
        applications,
      });
    } catch (err) {
      console.error(err);
    }
  },
  //edits residents clearance values for eligibility
  async editClearance(req, res) {
    try {
      let { residentID, dept } = req.params;
      const { clearance, comments } = req.body;
      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const category = dept;

      if (dept == "Sex-Offender") {
        dept = "sexOffender";
      }
      if (dept == "Victim-Services") {
        dept = "victimServices";
      }
      if (dept == "Deputy-Warden") {
        dept = "DW";
      }
      if (clearance === "true") {
        await createActivityLog(
          req.session.user._id.toString(),
          "clearance_approved",
          `Approved ${category} clearance for resident #${residentID}.`
        );

        const updateData = {
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
        await createActivityLog(
          req.session.user._id.toString(),
          "clearance_restricted",
          `Restricted ${category} clearance for resident #${residentID}.`
        );

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
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: name,
              note: `Denied clearance. ❌`,
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

      const { resident, applications, unitTeam, activities, res_id } =
        await getResidentProfileInfo(residentID);

      const activeTab = "clearance";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
        notifications,
        activities,
        applications,
        unitTeam,
      });
    } catch (err) {
      console.error(err);
    }
  },
  async findNotes(req, res) {
    try {
      const { residentID, dept } = req.params;

      const resident = await Resident.findOne({ residentID }).lean();

      if (!resident) {
        return res.status(404).json({ message: "Resident not found." }); // Handle case where resident is not found
      }

      // Dynamically create the key for the clearance field (e.g., MedicalClearance, EAIClearance)
      const clearanceKey = `${dept}Clearance`;

      // Check if the clearanceKey exists on the resident object
      if (!resident[clearanceKey]) {
        return res
          .status(404)
          .json({ message: `${dept} clearance not found.` }); // Handle case where the clearance field does not exist
      }

      const clearance = resident[clearanceKey];

      // Retrieve the notes from the clearance field
      const notes = clearance.notes;

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

      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

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
      const { resident, applications, unitTeam, activities, res_id } =
        await getResidentProfileInfo(residentID);

      await createActivityLog(
        req.session.user._id.toString(),
        "note_added",
        `Added note to resident #${residentID} clearance notes.`
      );

      const activeTab = "clearance";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        applications,
        activeTab,
        unitTeam,
        activities,
      });
    } catch (err) {
      console.error(err);
      logger.warn("An error occurred while fetching the notes: " + err);
      return res.render("error/500");
    }
  },
  //approved resident's eligibility to work
  async approveEligibility(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

      const { residentID } = req.params;

      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

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
      const { resident, applications, unitTeam, activities, res_id } =
        await getResidentProfileInfo(residentID);

      await createActivityLog(
        req.session.user._id.toString(),
        "approve_work_eligibility",
        `Approved work eligiblity for resident #${residentID}.`
      );

      const eligibleMsg = "This resident is approved and eligible for work.";
      const activeTab = "clearance";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
        notifications,
        eligibleMsg,
        applications,
        unitTeam,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //denies resident's eligibility to work
  async rejectEligibility(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { residentID } = req.params;
      const { rejectReason } = req.body;
      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

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

      const { resident, applications, unitTeam, activities, res_id } =
        await getResidentProfileInfo(residentID);

      await createActivityLog(
        req.session.user._id.toString(),
        "restrict_work_eligibility",
        `Restricted work eligiblity for resident #${residentID} for ${rejectReason}.`
      );
      const activeTab = "clearance";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        resident,
        activeTab,
        user: req.session.user,
        notifications,
        applications,
        unitTeam,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },

  async scheduleInterview(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { jobID } = req.params;
      const { residentID, date, time, instructions } = req.body;

      const res = await Resident.findOne({ residentID }).lean();

      const name = `${res.firstName} ${res.lastName}`;

      //if interview has already been requested by the employer for scheduling
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
          }
        );
      }

      const { resident, applications, unitTeam, activities, res_id } =
        await getResidentProfileInfo(residentID);

      const job = await Jobs.findOne({ _id: jobID }).lean();
      const companyName = job.companyName;

      //send notification to all PI partners in that company
      const employerEmails = await getEmployeeEmails(companyName);

      await sendNotificationsToEmployers(
        employerEmails,
        "interview_scheduled",
        `New interview scheduled for resident #${resident.residentID}.`
      );

      await createActivityLog(
        req.session.user._id.toString(),
        "interview_scheduled",
        `Scheduled ${companyName} interview for resident #${residentID}.`
      );

      await createActivityLog(
        resident._id.toString(),
        "interview_scheduled",
        `Interview scheduled for ${companyName} on ${date}.`
      );

      const activeTab = "application";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        activeTab,
        applications,
        unitTeam,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //employs resident to company
  async hireResident(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { res_id, jobID } = req.params;
      const position = await Jobs.findOne({ _id: jobID }).lean();
      const companyName = position.companyName;

      const { startDate } = req.body;

      //update resident object with hiring info
      await Resident.findByIdAndUpdate(res_id, {
        $set: {
          isHired: true,
          dateHired: startDate,
          companyName,
        },
      });
      const resInfo = await Resident.findById(res_id).lean();
      const residentID = resInfo.residentID;

      //send notification to all PI partners in that company
      const employerEmails = await getEmployeeEmails(companyName);
      await sendNotificationsToEmployers(
        employerEmails,
        "resident_hired",
        `Resident #${residentID} is now employed with your company.`
      );

      //remove user from applicants/ interviews add to workforce
      await Jobs.findByIdAndUpdate(jobID, {
        $pull: {
          applicants: { resident_id: res_id }, // Remove resident from the applicants array
          interviews: { residentID: residentID }, // Remove interview with the given residentID
        },
        $push: {
          employees: res_id, // Add the resident to the employees array
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
            applicants: { resident_id: res_id }, // Remove resident_id from the applicants array
            interviews: { residentID: residentID }, // Remove interview with the given residentID
          },
        }
      );

      const { resident, applications, unitTeam, activities } =
        await getResidentProfileInfo(residentID);

      await createActivityLog(
        req.session.user._id.toString(),
        "resident_hired",
        `Employed resident #${residentID} at ${companyName}.`
      );

      await createActivityLog(
        res_id.toString(),
        "resident_hired",
        `Employed at ${companyName} on ${startDate}.`
      );

      const activeTab = "application";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        activeTab,
        applications,
        unitTeam,
        activities,
      });
    } catch (err) {
      console.log("Error in hiring resident: ", err);
      res.render("error/500");
    }
  },
  //rejects resident application
  async rejectHire(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

      const { res_id, jobID } = req.params;

      await Resident.findByIdAndUpdate(res_id, {
        $set: {
          isHired: false,
          companyName: "",
          dateHired: null,
        },
      });
      const res = await Resident.findById(res_id).lean();
      const residentID = res.residentID;

      //remove user from applicants/ interviews
      const updatedJob = await Jobs.findByIdAndUpdate(
        { _id: jobID },
        {
          $pull: {
            applicants: { resident_id: res_id },
            interviews: { residentID: residentID },
          },
        },
        { new: true }
      );

      const { resident, applications, unitTeam, activities } =
        await getResidentProfileInfo(residentID);

      await createActivityLog(
        req.session.user._id.toString(),
        "application_rejected",
        `Rejected ${updatedJob.companyName} application from resident #${resident.residentID}.`
      );

      const activeTab = "application";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        activeTab,
        applications,
        unitTeam,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  //terminates resident
  async terminateResident(req, res) {
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );
      const { res_id } = req.params;
      const { terminationReason, workRestriction, notes } = req.body;

      const resInfo = await Resident.findById(res_id).lean();
      console.log(resInfo);
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
      await Resident.updateOne({ _id: res_id }, updateData);

      const resident = await Resident.findById(res_id).lean();
      const residentID = resident.residentID;
      //remove employees from Jobs DB
      await Jobs.findOneAndUpdate(
        { employees: res_id }, // Find the job where res_id exists in employees
        {
          $pull: { employees: res_id }, // Remove the res_id from the employees array
          $inc: { availablePositions: 1 }, // Increment availablePositions by 1
        }
      );

      const { applications, unitTeam, activities } =
        await getResidentProfileInfo(residentID);

      console.log(companyName);

      //send notification to all PI partners in that company
      const employerEmails = await getEmployeeEmails(companyName);
      console.log(employerEmails);

      await sendNotificationsToEmployers(
        employerEmails,
        "resident_terminated",
        `Resident #${resident.residentID} has been terminated from your company.`
      );

      await createActivityLog(
        req.session.user._id.toString(),
        "resident_terminated",
        `Terminated resident #${resident.residentID} from ${companyName}.`
      );

      await createActivityLog(
        res_id.toString(),
        "resident_terminated",
        `Terminated from ${companyName}.`
      );

      const activeTab = "application";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        activeTab,
        applications,
        unitTeam,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
  async cancelTerminationRequest(req, res) {
    try {
      const { res_id } = req.params;
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

      await Resident.updateOne(
        { _id: res_id },

        { $unset: { terminationRequest: "" } } // Remove the terminationRequest field
      );

      //send notification to all PI partners in that company
      const resident = await Resident.findById(res_id).lean();
      const companyName = resident.companyName;
      const employerEmails = await getEmployeeEmails(companyName);
      await sendNotificationsToEmployers(
        employerEmails,
        "termination_request_denied",
        `The termination request for #${resident.residentID} has been denied.`
      );

      await createActivityLog(
        req.session.user._id.toString(),
        "termination_request_denied",
        `Denied termination request from ${companyName} for resident #${resident.residentID}.`
      );

      //find positions resident has applied for
      const applications = await Jobs.find({
        "applicants.resident_id": res_id, // Match the resident_id field inside the applicants array
      }).lean();
      const activeTab = "application";
      res.render(`${req.session.user.role}/profiles/residentProfile`, {
        user: req.session.user,
        notifications,
        resident,
        activeTab,
        applications,
      });
    } catch (err) {
      console.log(err);
      res.render("error/500");
    }
  },
};
