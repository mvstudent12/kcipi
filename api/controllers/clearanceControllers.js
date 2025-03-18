const Resident = require("../models/Resident");
const Jobs = require("../models/Jobs");

const mongoose = require("mongoose");

const logger = require("../utils/logger");

const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
  checkClearanceStatus,
  createUpdateData,
  logClearanceActivity,
  sendClearanceNotification,
} = require("../utils/clearanceUtils");

const { sendReviewEmail } = require("../utils/emailUtils/notificationEmail");
const { createNotification } = require("../utils/notificationUtils");
const { createActivityLog } = require("../utils/activityLogUtils");
const { validateResidentID } = require("../utils/validationUtils");
const { mapDepartmentName } = require("../utils/requestUtils.js");

module.exports = {
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

      res.redirect(`/shared/residentProfile/${residentID}?activeTab=overview`);
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
          `Resume rejected for resident #${resident.residentID} by ${req.session.user.email}.`,
          `/shared/residentProfile/${resident.residentID}?activeTab=resume`
        );
      }
      res.redirect(`/shared/residentProfile/${residentID}?activeTab=resume`);
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
          `Resume approved for resident #${resident.residentID} by ${req.session.user.email}.`,
          `/shared/residentProfile/${resident.residentID}?activeTab=resume`
        );
      }

      res.redirect(`/shared/residentProfile/${residentID}?activeTab=resume`);
    } catch (err) {
      console.error("Error approving resident resume: ", err);
      res.render("error/500");
    }
  },
  async requestClearance(req, res) {
    let { recipient, comments } = req.body;
    let { residentID, deptName } = req.params;

    try {
      const sender = req.session.user.email;
      const dept = mapDepartmentName(deptName);
      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

      //change residents clearance status to show as pending
      const resident = await Resident.findOneAndUpdate(
        { residentID: residentID },
        {
          $set: {
            [`${dept}Clearance.status`]: "pending",
          },
          $push: {
            [`${dept}Clearance.notes`]: {
              createdAt: new Date(),
              createdBy: name,
              note: `Clearance request sent to ${recipient}.`,
            },
          },
        },
        { new: true }
      );

      //send notification to facility_management
      if (dept == "DW" || dept == "Warden") {
        await createNotification(
          recipient,
          "facility_management",
          "clearance_requested",
          `Clearance is requested for resident #${residentID}.`,
          `/shared/residentProfile/${residentID}?activeTab=clearance`
        );
      }
      //send notification to classification
      if (dept == "Classification") {
        await createNotification(
          recipient,
          "classification",
          "clearance_requested",
          `Clearance is requested for resident #${residentID}.`,
          `/shared/residentProfile/${residentID}?activeTab=clearance`
        );
      }
      sendReviewEmail(
        resident,
        deptName,
        recipient,
        sender,
        comments,
        `request/reviewClearance/${deptName}/${residentID}/${recipient}`
      );

      // Log activity
      await createActivityLog(
        req.session.user._id.toString(),
        "clearance_requested",
        `Requested ${deptName} clearance for #${residentID}.`
      );

      res.redirect(`/shared/residentProfile/${residentID}?activeTab=clearance`);
    } catch (err) {
      console.error(
        "An error occurred when trying to request clearance approval via email: ",
        err
      );
      res.render("error/500");
    }
  },
  async editClearance(req, res) {
    const { residentID, dept } = req.params;
    const { clearance, comments } = req.body;
    const name = `${req.session.user.firstName} ${req.session.user.lastName}`;
    const category = dept;
    const deptName = mapDepartmentName(dept);

    try {
      validateResidentID(residentID);
      if (!["true", "false"].includes(clearance)) {
        throw new Error("Invalid clearance value");
      }

      // Create update data based on clearance status
      const updateData = createUpdateData(
        clearance,
        deptName,
        name,
        comments,
        category
      );

      // Log activity based on clearance status
      await logClearanceActivity(
        req.session.user._id,
        clearance,
        category,
        residentID
      );

      // Update resident's clearance and work status
      const resident = await Resident.findOneAndUpdate(
        { residentID },
        updateData,
        { new: true }
      );

      // Update work eligibility based on new clearance status
      const workStatus = await checkClearanceStatus(residentID);
      resident.workEligibility.status = workStatus;
      await resident.save();

      // Send notification if outside of caseload
      if (resident.resume.unitTeam !== req.session.user.email) {
        await sendClearanceNotification(
          resident,
          clearance,
          category,
          req.session.user.email
        );
      }

      res.redirect(`/shared/residentProfile/${residentID}?activeTab=clearance`);
    } catch (err) {
      console.error("Error updating clearance:", err.message);
      res.status(500).render("error/500", { error: err.message });
    }
  },
  async findNotes(req, res) {
    const { residentID, dept } = req.params;
    try {
      validateResidentID(residentID);
      const resident = await Resident.findOne({ residentID });

      if (!resident) {
        return res.status(404).json({ message: "Resident not found." });
      }

      const clearanceKey = `${dept}Clearance`;

      if (!resident[clearanceKey]) {
        return res
          .status(404)
          .json({ message: `${dept} clearance not found.` });
      }

      const clearance = resident[clearanceKey];
      let notes = clearance.notes;

      return res.status(200).json({ notes });
    } catch (err) {
      console.error(err); // Ensure that this is correctly captured in the test
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

      res.redirect(`/shared/residentProfile/${residentID}?activeTab=clearance`);
    } catch (err) {
      console.error(err);
      logger.warn("An error occurred while adding resident notes: ", err);
      return res.render("error/500");
    }
  },
  async scheduleInterview(req, res) {
    const { applicationID } = req.params;
    const { date, time, instructions, residentID } = req.body;
    try {
      const updatedInterview = await Jobs.findOneAndUpdate(
        { "applicants._id": new mongoose.Types.ObjectId(applicationID) },
        {
          $set: {
            "applicants.$.interview.status": "scheduled",
            "applicants.$.interview.dateScheduled": date,
            "applicants.$.interview.time": time,
            "applicants.$.interview.instructions": instructions.trim() || "",
          },
        },
        { new: true } // Return the updated document
      ).lean();

      if (!updatedInterview) {
        throw new Error("Application not found or update failed");
      }

      // Find the updated applicant from the applicants array
      const updatedApplicant = updatedInterview.applicants.find(
        (app) => app._id.toString() === applicationID
      );

      //send notification to all PI partners in that company
      const employerEmails = await getEmployeeEmails(
        updatedInterview.companyName
      );
      if (employerEmails) {
        await sendNotificationsToEmployers(
          employerEmails,
          "interview_scheduled",
          `New interview scheduled for resident #${updatedApplicant.residentID}.`,
          `/employer/residentProfile/${updatedApplicant.residentID}?activeTab=application`
        );
      }

      await createActivityLog(
        req.session.user._id.toString(),
        "interview_scheduled",
        `Scheduled interview for resident #${residentID} with ${updatedInterview.companyName}.`
      );

      await createActivityLog(
        updatedApplicant.resident_id.toString(),
        "interview_scheduled",
        `Scheduled interview with ${updatedInterview.companyName}.`
      );

      res.redirect(
        `/shared/residentProfile/${residentID}?activeTab=application`
      );
    } catch (err) {
      console.error("Error scheduling interview:", err);
      logger.warn("An error occurred while scheduling the interview: " + err);
      res.render("error/500");
    }
  },
  async hireResident(req, res) {
    const { res_id, applicationID } = req.params;
    const { startDate } = req.body;

    //use session ansd transaction to ensure simulataneous updates in db
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      //find job position that holds resident application
      const position = await Jobs.findOne({
        "applicants._id": new mongoose.Types.ObjectId(applicationID),
      }).session(session); // Use session here

      if (!position) throw new Error("Position not found");

      const companyName = position.companyName;

      //update resident object with hiring info
      const resident = await Resident.findByIdAndUpdate(
        res_id,
        {
          $set: {
            "terminationRequest.companyName": "",
            "terminationRequest.requestDate": null,
            "terminationRequest.terminationReason": "",
            "terminationRequest.notes": "",
            isHired: true,
            dateHired: startDate,
            companyName,
          },
        },
        { new: true, session }
      );

      if (!resident) throw new Error("Resident not found");

      const residentID = resident.residentID;

      //send notification to all PI partners in that company
      const employerEmails = await getEmployeeEmails(companyName);
      await sendNotificationsToEmployers(
        employerEmails,
        "resident_hired",
        `Resident #${residentID} is now employed with your company.`,
        `/employer/residentProfile/${residentID}?activeTab=application`,
        session
      );

      //remove user from applicants and interviews, add to workforce
      await Jobs.findOneAndUpdate(
        { "applicants._id": applicationID },
        {
          $pull: {
            applicants: { _id: applicationID },
          }, // Remove the applicant from the list
          $push: {
            employees: res_id, // Add the resident to the employees array
          },
          $inc: {
            availablePositions: -1, // Subtract 1 from availablePositions
          },
        },
        { session } // Use session here
      );

      //remove resident from all other applied jobs
      await Jobs.updateMany(
        { "applicants.resident_id": res_id },
        {
          $pull: {
            applicants: { resident_id: res_id }, // Remove resident_id from the applicants array
          },
        },
        { session } // Use session here
      );

      await createActivityLog(
        req.session.user._id.toString(),
        "resident_hired",
        `Employed resident #${residentID} at ${companyName}.`,
        session
      );

      await createActivityLog(
        res_id.toString(),
        "resident_hired",
        `Employed at ${companyName} on ${startDate}.`,
        session
      );

      //commit the transaction
      await session.commitTransaction();
      session.endSession();

      //redirect user to resident profile
      res.redirect(
        `/shared/residentProfile/${residentID}?activeTab=application`
      );
    } catch (err) {
      // If any error occurs, roll back the transaction
      await session.abortTransaction();
      session.endSession();
      console.log("Error in hiring resident: ", err);
      res.render("error/500");
    }
  },
  async rejectHire(req, res) {
    const { res_id, applicationID } = req.params;

    const session = await mongoose.startSession(); // Start a session
    session.startTransaction();
    try {
      //update resident's hired status
      const resident = await Resident.findByIdAndUpdate(
        res_id,
        {
          $set: {
            isHired: false,
            companyName: "",
            dateHired: null,
          },
        },
        { new: true, session } // Pass session to ensure the operation is part of the transaction
      );

      if (!resident) {
        throw new Error("Resident not found");
      }

      const residentID = resident.residentID;

      //Remove the resident from the applicants in the job document
      const updatedJob = await Jobs.findOneAndUpdate(
        { "applicants._id": applicationID },
        {
          $pull: {
            applicants: { _id: applicationID },
          },
        },
        { new: true, session }
      );

      if (!updatedJob) {
        throw new Error("Job not found or applicant not present");
      }

      //create activity logs for resident and user
      await createActivityLog(
        req.session.user._id.toString(),
        "application_rejected",
        `Rejected ${updatedJob.companyName} application from resident #${resident.residentID}.`,
        session
      );

      await createActivityLog(
        resident._id.toString(),
        "application_rejected",
        `Application for ${updatedJob.companyName} not accepted at this time.`,
        session
      );

      //Commit the transaction if all operations succeed
      await session.commitTransaction();

      //End the session
      session.endSession();

      //redirect to resident profile page
      res.redirect(
        `/shared/residentProfile/${residentID}?activeTab=application`
      );
    } catch (err) {
      // In case of error, abort the transaction
      console.log("Error rejecting resident hire: ", err);
      await session.abortTransaction();
      session.endSession();

      res.render("error/500");
    }
  },
  async terminateResident(req, res) {
    const { res_id } = req.params;
    const { terminationReason, workRestriction, notes } = req.body;

    const session = await mongoose.startSession(); // Start a session
    session.startTransaction(); // Start a transact
    try {
      const resident = await Resident.findById(res_id).lean();
      const dateHired = resident.dateHired;
      const companyName = resident.companyName;

      const name = `${req.session.user.firstName} ${req.session.user.lastName}`;

      let updateData = {};

      if (workRestriction === "restricted") {
        updateData = {
          $set: {
            "terminationRequest.companyName": "",
            "terminationRequest.requestDate": null,
            "terminationRequest.terminationReason": "",
            "terminationRequest.notes": "",
            isHired: false,
            companyName: "",
            dateHired: null,
            "workEligibility.status": "restricted",
            restrictionReason: `Resident is restricted from work due to termination for ${terminationReason}.`,
            "MedicalClearance.status": "restricted",
            "EAIClearance.status": "restricted",
            "ClassificationClearance.status": "restricted",
            "DWClearance.status": "restricted",
            "WardenClearance.status": "restricted",
            "sexOffenderClearance.status": "restricted",
            "victimServicesClearance.status": "restricted",
          },
          $push: {
            "MedicalClearance.notes": {
              createdAt: new Date(),
              createdBy: name,
              note: `Resident restricted due to termination for: ${terminationReason}. ❌`,
            },
            "EAIClearance.notes": {
              createdAt: new Date(),
              createdBy: name,
              note: `Resident restricted due to termination for: ${terminationReason}. ❌`,
            },
            "ClassificationClearance.notes": {
              createdAt: new Date(),
              createdBy: name,
              note: `Resident restricted due to termination for: ${terminationReason}. ❌`,
            },
            "DWClearance.notes": {
              createdAt: new Date(),
              createdBy: name,
              note: `Resident restricted due to termination for: ${terminationReason}. ❌`,
            },
            "WardenClearance.notes": {
              createdAt: new Date(),
              createdBy: name,
              note: `Resident restricted due to termination for: ${terminationReason}. ❌`,
            },
            "sexOffenderClearance.notes": {
              createdAt: new Date(),
              createdBy: name,
              note: `Resident restricted due to termination for: ${terminationReason}. ❌`,
            },
            "victimServicesClearance.notes": {
              createdAt: new Date(),
              createdBy: name,
              note: `Resident restricted due to termination for: ${terminationReason}. ❌`,
            },
            workHistory: {
              companyName: companyName,
              startDate: dateHired ? new Date(dateHired) : null,
              endDate: new Date(),
              reasonForLeaving: terminationReason || "",
              note: notes
                ? {
                    createdAt: new Date(),
                    createdBy: name,
                    note: notes,
                  }
                : undefined,
            },
          },
        };
      } else {
        updateData = {
          $set: {
            isHired: false,
            companyName: "",
            dateHired: null,
            "workEligibility.status": "approved",
          },
          $push: {
            workHistory: {
              companyName: companyName,
              startDate: dateHired ? new Date(dateHired) : null,
              endDate: new Date(),
              reasonForLeaving: terminationReason || "",
              note: notes
                ? {
                    createdAt: new Date(),
                    createdBy: name,
                    note: notes,
                  }
                : undefined,
            },
          },
        };
      }

      // Perform the update within the session
      await Resident.findOneAndUpdate({ _id: res_id }, updateData, {
        new: true,
        session,
      });

      const residentID = resident.residentID;

      //remove employees from Jobs DB
      await Jobs.findOneAndUpdate(
        { employees: res_id }, // Find the job where res_id exists in employees
        {
          $pull: { employees: res_id }, // Remove the res_id from the employees array
          $inc: { availablePositions: 1 }, // Increment availablePositions by 1
        },
        { session } // Pass session to ensure the operation is part of the transaction
      );

      //send notification to all PI partners in that company
      const employerEmails = await getEmployeeEmails(companyName);
      await sendNotificationsToEmployers(
        employerEmails,
        "resident_terminated",
        `Resident #${resident.residentID} has been terminated from your company.`,
        `/employer/residentProfile/${resident.residentID}?activeTab=application`,
        session
      );

      // Create activity logs for both the user and the resident
      await createActivityLog(
        req.session.user._id.toString(),
        "resident_terminated",
        `Terminated resident #${resident.residentID} from ${companyName}.`,
        session
      );

      await createActivityLog(
        res_id.toString(),
        "resident_terminated",
        `Terminated from ${companyName}.`,
        session
      );

      // Commit the transaction if everything goes well
      await session.commitTransaction();

      // End the session
      session.endSession();

      // Redirect to the resident profile page
      res.redirect(
        `/shared/residentProfile/${residentID}?activeTab=work-history`
      );
    } catch (err) {
      // In case of error, abort the transaction
      console.log("Error terminating resident: ", err);
      await session.abortTransaction();
      session.endSession();

      res.render("error/500");
    }
  },
  async cancelTerminationRequest(req, res) {
    const { res_id } = req.params;
    const session = await mongoose.startSession(); // Start a session
    session.startTransaction(); // Start a transaction
    try {
      // Find and update the resident to unset the termination request field
      const resident = await Resident.findOneAndUpdate(
        { _id: res_id },
        { $unset: { terminationRequest: "" } }, // Remove the terminationRequest field
        { new: true, session }
      );

      //send notification to all PI partners in that company
      const companyName = resident.companyName;
      const employerEmails = await getEmployeeEmails(companyName);
      await sendNotificationsToEmployers(
        employerEmails,
        "termination_request_denied",
        `The termination request for #${resident.residentID} has been denied.`,
        `/employer/residentProfile/${resident.residentID}?activeTab=application`,
        session
      );

      // Create activity log for this action
      await createActivityLog(
        req.session.user._id.toString(),
        "termination_request_denied",
        `Denied termination request from ${companyName} for resident #${resident.residentID}.`,
        session
      );

      // Commit the transaction if all operations succeed
      await session.commitTransaction();
      session.endSession(); // End the session

      // Redirect to the resident profile page
      res.redirect(
        `/shared/residentProfile/${resident.residentID}?activeTab=application`
      );
    } catch (err) {
      // In case of an error, abort the transaction
      console.log("Error rejecting termination request from employer: ", err);
      await session.abortTransaction();
      session.endSession(); // End the session
      res.render("error/500");
    }
  },
};
