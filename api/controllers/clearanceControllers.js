const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");

const mongoose = require("mongoose");

const logger = require("../utils/logger");

const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
  getResidentProfileInfo,
  checkClearanceStatus,
} = require("../utils/clearanceUtils");

const {
  getUserNotifications,
  createNotification,
} = require("../utils/notificationUtils");

const { createActivityLog } = require("../utils/activityLogUtils");
const { validateResidentID } = require("../utils/validationUtils");
const { mapDepartmentName } = require("../utils/requestUtils.js");

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

  async residentProfile(req, res) {
    const { residentID } = req.params;
    let { activeTab } = req.query;
    try {
      const notifications = await getUserNotifications(
        req.session.user.email,
        req.session.user.role
      );

      validateResidentID(residentID);

      const { resident, applications, unitTeam, activities } =
        await getResidentProfileInfo(residentID);

      if (!activeTab) activeTab = "overview";
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
  //allows editing of resident data from residentProfile page
  async editResident(req, res) {
    let { residentID, custodyLevel, facility, unitTeamInfo, jobPool } =
      req.body;
    try {
      validateResidentID(residentID);

      // Split unitTeamInfo to get name and email (ensure it's in the expected format)
      let [unitTeamEmail, unitTeamName] = unitTeamInfo.split("|");
      if (!unitTeamEmail || !unitTeamName) {
        throw new Error("Invalid unit team information.");
      }

      // Update the resident information
      await Resident.findOneAndUpdate(
        { residentID: residentID },
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

      // Log activity
      await createActivityLog(
        req.session.user._id.toString(),
        "edited_user",
        `Edited resident #${residentID}.`
      );

      res.redirect(
        `/clearance/residentProfile/${residentID}?activeTab=overview`
      );
    } catch (err) {
      console.error("Error editing resident profile: ", err);
      res.render("error/500");
    }
  },

  async rejectResume(req, res) {
    const { residentID } = req.params;
    const { rejectReason } = req.body;
    try {
      validateResidentID(residentID);

      const resident = await Resident.findOneAndUpdate(
        { residentID: residentID },
        {
          $set: {
            "resume.status": "rejected",
            "resume.rejectionReason": rejectReason,
          },
        },
        { new: true }
      );

      //log activities
      await createActivityLog(
        req.session.user._id.toString(),
        "resume_rejected",
        `Rejected resume for resident #${residentID} for being ${rejectReason}.`
      );

      await createActivityLog(
        resident._id.toString(),
        "resume_rejected",
        `Resume rejected by Unit Team for being ${rejectReason}.`
      );

      //if this action is done outside of caseload - notify unit team
      if (resident.resume.unitTeam != req.session.user.email) {
        await createNotification(
          resident.resume.unitTeam,
          "unitTeam",
          "resume_rejected",
          `Resume rejected for resident #${resident.residentID} by ${req.session.user.email}.`
        );
      }
      res.redirect(`/clearance/residentProfile/${residentID}?activeTab=resume`);
    } catch (err) {
      console.error("Error rejecting resident resume: ", err);
      res.render("error/500");
    }
  },
  async approveResume(req, res) {
    const { residentID } = req.params;
    const { jobPool } = req.body;
    try {
      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

      validateResidentID(residentID);

      const resident = await Resident.findOneAndUpdate(
        { residentID },
        {
          $set: {
            "resume.status": "approved",
            "resume.approvedBy": name,
            "resume.approvalDate": new Date(),
            jobPool: jobPool,
          },
        },
        { new: true } // Returns the updated document
      );

      await createActivityLog(
        req.session.user._id.toString(),
        "resume_approved",
        `Approved resume for resident #${residentID}.`
      );
      await createActivityLog(
        resident._id.toString(),
        "resume_approved",
        `Resume approved by Unit Team.`
      );

      //send notification if action was taken outside of caseload
      if (resident.resume.unitTeam != req.session.user.email) {
        await createNotification(
          resident.resume.unitTeam,
          "unitTeam",
          "resume_approved",
          `Resume approved for resident #${resident.residentID} by ${req.session.user.email}.`
        );
      }

      res.redirect(`/clearance/residentProfile/${residentID}?activeTab=resume`);
    } catch (err) {
      console.error("Error approving resident resume: ", err);
      res.render("error/500");
    }
  },
  //edit resident work eligibility based on category
  async editClearance(req, res) {
    let { residentID, dept } = req.params;
    const { clearance, comments } = req.body;

    try {
      validateResidentID(residentID);

      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

      const category = dept;
      dept = mapDepartmentName(dept);

      if (clearance === "true") {
        //if clearance is approved
        await createActivityLog(
          req.session.user._id.toString(),
          "clearance_approved",
          `Approved ${category} clearance for resident #${residentID}.`
        );

        const updateData = {
          $set: {
            [`${dept}Clearance.status`]: "approved",
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
        //is clearance is denied
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

      //update resident workStatus
      const workStatus = await checkClearanceStatus(residentID);
      await Resident.updateOne(
        { residentID },
        {
          $set: {
            "workEligibility.status": workStatus,
          },
        }
      );

      const { resident } = await getResidentProfileInfo(residentID);

      //send notification if action was taken outside of caseload
      if (resident.resume.unitTeam != req.session.user.email) {
        if (clearance === "true") {
          await createNotification(
            resident.resume.unitTeam,
            "unitTeam",
            "clearance_approved",
            `${category} clearance approved for resident #${resident.residentID} by ${req.session.user.email}.`
          );
        }
        if (clearance === "false") {
          await createNotification(
            resident.resume.unitTeam,
            "unitTeam",
            "clearance_denied",
            `${category} clearance denied for resident #${resident.residentID} by ${req.session.user.email}.`
          );
        }
      }

      res.redirect(
        `/clearance/residentProfile/${residentID}?activeTab=clearance`
      );
    } catch (err) {
      console.error("Error providing resident clearance: ", err);
      res.render("error/500");
    }
  },
  async findNotes(req, res) {
    try {
      const { residentID, dept } = req.params;
      validateResidentID(residentID);

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
      let notes = clearance.notes;

      return res.status(200).json({ notes }); // Return the notes in the response body
    } catch (err) {
      console.error(err); // Log the error for debugging
      logger.warn(
        "An error occurred while fetching resident clearance notes: " + err
      );
      return res.render("error/500");
    }
  },
  async addNotes(req, res) {
    let { residentID, dept } = req.params;
    const { notes } = req.body;
    try {
      validateResidentID(residentID);

      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;
      dept = mapDepartmentName(dept);

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

      await createActivityLog(
        req.session.user._id.toString(),
        "note_added",
        `Added note to resident #${residentID} clearance notes.`
      );

      res.redirect(
        `/clearance/residentProfile/${residentID}?activeTab=clearance`
      );
    } catch (err) {
      console.error(err);
      logger.warn("An error occurred while adding resident notes: ", err);
      return res.render("error/500");
    }
  },

  async scheduleInterview(req, res) {
    const { jobID } = req.params;
    const { residentID, date, time, instructions } = req.body;
    try {
      validateResidentID(residentID);

      const resident = await Resident.findOne({ residentID }).lean();

      const name = `${resident.firstName} ${resident.lastName}`;

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

      res.redirect(
        `/clearance/residentProfile/${residentID}?activeTab=application`
      );
    } catch (err) {
      console.log("Error in scheduling resident interview: ", err);
      res.render("error/500");
    }
  },
  //employs resident to company
  async hireResident(req, res) {
    const { res_id, jobID } = req.params;
    const { startDate } = req.body;
    try {
      const position = await Jobs.findOne({ _id: jobID }).lean();
      const companyName = position.companyName;

      //update resident object with hiring info
      const resident = await Resident.findByIdAndUpdate(
        res_id,
        {
          $set: {
            isHired: true,
            dateHired: startDate,
            companyName,
          },
        },
        { new: true }
      );

      const residentID = resident.residentID;
      validateResidentID(residentID);

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

      res.redirect(
        `/clearance/residentProfile/${residentID}?activeTab=application`
      );
    } catch (err) {
      console.log("Error in hiring resident: ", err);
      res.render("error/500");
    }
  },
  //rejects resident application
  async rejectHire(req, res) {
    const { res_id, jobID } = req.params;
    try {
      const resident = await Resident.findByIdAndUpdate(
        res_id,
        {
          $set: {
            isHired: false,
            companyName: "",
            dateHired: null,
          },
        },
        { new: true }
      );

      const residentID = resident.residentID;
      validateResidentID(residentID);

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

      await createActivityLog(
        req.session.user._id.toString(),
        "application_rejected",
        `Rejected ${updatedJob.companyName} application from resident #${resident.residentID}.`
      );

      await createActivityLog(
        resident._id.toString(),
        "application_rejected",
        `Application for ${updatedJob.companyName} not accepted at this time.`
      );

      res.redirect(
        `/clearance/residentProfile/${residentID}?activeTab=application`
      );
    } catch (err) {
      console.log("Error rejecting resident hire: ", err);
      res.render("error/500");
    }
  },
  //terminates resident
  async terminateResident(req, res) {
    const { res_id } = req.params;
    const { terminationReason, workRestriction, notes } = req.body;
    try {
      const resInfo = await Resident.findById(res_id).lean();

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
      const resident = await Resident.findOneAndUpdate(
        { _id: res_id },
        updateData,
        { new: true }
      );

      const residentID = resident.residentID;

      validateResidentID(residentID);
      //remove employees from Jobs DB
      await Jobs.findOneAndUpdate(
        { employees: res_id }, // Find the job where res_id exists in employees
        {
          $pull: { employees: res_id }, // Remove the res_id from the employees array
          $inc: { availablePositions: 1 }, // Increment availablePositions by 1
        }
      );

      //send notification to all PI partners in that company
      const employerEmails = await getEmployeeEmails(companyName);

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

      res.redirect(
        `/clearance/residentProfile/${residentID}?activeTab=application`
      );
    } catch (err) {
      console.log("Error terminating resident: ", err);
      res.render("error/500");
    }
  },
  async cancelTerminationRequest(req, res) {
    const { res_id } = req.params;
    try {
      const resident = await Resident.findOneAndUpdate(
        { _id: res_id },

        { $unset: { terminationRequest: "" } }, // Remove the terminationRequest field
        { new: true }
      );

      //send notification to all PI partners in that company
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

      res.redirect(
        `/clearance/residentProfile/${resident.residentID}?activeTab=application`
      );
    } catch (err) {
      console.log("Error rejecting termiantion request from employer: ", err);
      res.render("error/500");
    }
  },
};
