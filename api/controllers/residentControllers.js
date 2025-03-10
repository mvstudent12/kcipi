const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Employer = require("../models/Employer");
const Company = require("../models/Company");
const Jobs = require("../models/Jobs");
const ActivityLog = require("../models/ActivityLog");

const mongoose = require("mongoose");

const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
} = require("../utils/clearanceUtils");

const { createActivityLog } = require("../utils/activityLogUtils");

const { createNotification } = require("../utils/notificationUtils");

module.exports = {
  async dashboard(req, res) {
    try {
      const workClearance = req.session.resident.workEligibility.status;
      const jobPool = req.session.resident.jobPool;
      const res_id = req.session.resident._id;
      const residentID = req.session.resident.residentID;
      const facility = req.session.resident.facility;
      const residentObjectId = new mongoose.Types.ObjectId(res_id);

      //if resident has been cleared to work
      if (workClearance === "approved") {
        //find all jobs in resident's job pool and facility
        const jobs = await Jobs.aggregate([
          {
            $match: {
              jobPool: jobPool, // Match jobs with the same jobPool as the resident
              facility: facility,
              availablePositions: { $gt: 0 },
            },
          },
          {
            //show whether resident has applied to this job with added residentInApplicants field
            $addFields: {
              residentInApplicants: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$applicants", // The array to filter
                        as: "applicant",
                        cond: {
                          $eq: ["$$applicant.resident_id", residentObjectId],
                        },
                      },
                    },
                  },
                  0, // Returns true if at least one match is found
                ],
              },
            },
          },
        ]);

        const applicationCount = jobs.filter(
          (job) => job.residentInApplicants
        ).length;

        //check for interviews
        const interviews = await Jobs.aggregate([
          // Unwind the applicants array to access interviews
          { $unwind: "$applicants" },

          // Match applicants with the specified residentID
          {
            $match: {
              "applicants.residentID": residentID,
              "applicants.interview": { $exists: true }, // Ensure interview exists
            },
          },

          // Project necessary fields
          {
            $project: {
              _id: 0, // Exclude the document's ObjectId
              companyName: 1, // Include company name
              position: 1, // Include position
              interview: "$applicants.interview", // Include interview details directly
            },
          },

          // Unwind the interview array if it is an array (optional based on schema)
          { $unwind: "$interview" },

          // Project specific fields from interview
          {
            $project: {
              companyName: 1,
              position: 1,
              "interview.dateScheduled": 1,
              "interview.time": 1,
              "interview.instructions": 1,
              "interview.isRequested": 1,
            },
          },
        ]);

        res.render("resident/dashboard", {
          user: req.session.resident,
          jobs,
          applicationCount,
          interviews,
        });
      } else {
        const applicationCount = 0;
        res.render("resident/dashboard", {
          user: req.session.resident,
          applicationCount,
        });
      }
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
    }
  },
  async profile(req, res) {
    try {
      const unitTeam = await UnitTeam.find({
        facility: req.session.resident.facility,
      })
        .sort({ lastName: 1 })
        .lean();
      res.render("resident/profile", {
        unitTeam,
        user: req.session.resident,
      });
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
    }
  },
  async saveResume(req, res) {
    const res_id = req.session.resident._id.toString();
    const {
      unitTeam,
      legalCitizen,
      hsGraduate,
      sscard,
      birthCertificate,
      workHistory,
      certifications,
      education,
      programs,
      skills,
    } = req.body;
    try {
      const unitTeamMember = await UnitTeam.findOne({ email: unitTeam }).lean();
      const unitTeamName = `${unitTeamMember.firstName} ${unitTeamMember.lastName}`;

      await Resident.findOneAndUpdate(
        { _id: res_id },
        {
          $set: {
            "resume.unitTeam": unitTeam,
            "resume.legalCitizen": legalCitizen,
            "resume.hsGraduate": hsGraduate,
            "resume.sscard": sscard,
            "resume.birthCertificate": birthCertificate,
            "resume.workHistory": workHistory,
            "resume.certifications": certifications,
            "resume.education": education,
            "resume.programs": programs,
            "resume.skills": skills,
            "resume.status": "pending",
            "resume.createdAt": new Date(),
            "resume.rejectionReason": "",
            unitTeam: unitTeamName,
          },
        }
      );

      await createActivityLog(
        res_id,
        "submitted_resume",
        `Submitted resume to Unit Team.`
      );

      res.redirect(`/resident/profile`);
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
    }
  },
  async applications(req, res) {
    try {
      const id = req.session.resident._id;

      const appliedJobs = await Jobs.aggregate([
        {
          $unwind: "$applicants", // Unwind the applicants array to access each applicant
        },
        {
          $match: {
            "applicants.resident_id": new mongoose.Types.ObjectId(id), // Match jobs where the resident's ID is in applicants.resident_id
          },
        },
        {
          $project: {
            _id: 1, // Optionally exclude the job's _id from the result
            companyName: "$companyName", // Include company name
            pay: "$pay", // Include pay details
            position: "$position", // Include the job position
            dateApplied: "$applicants.dateApplied",
          },
        },
      ]);

      res.render("resident/applications", {
        user: req.session.resident,
        appliedJobs,
      });
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
    }
  },
  async jobInfo(req, res) {
    const { jobID } = req.params;
    const res_id = req.session.resident._id;
    try {
      // fetch job
      let position = await Jobs.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(jobID),
          },
        },
        {
          $addFields: {
            residentInApplicants: {
              $cond: {
                if: {
                  $in: [
                    new mongoose.Types.ObjectId(res_id),
                    "$applicants.resident_id", // Adjusted to check inside the applicants array
                  ],
                },
                then: true,
                else: false,
              },
            },
          },
        },
      ]);
      position = position[0];
      const residentHasApplied = true;
      if (position.residentInApplicants) {
        res.render("resident/jobInfo", {
          user: req.session.resident,
          position,
          residentHasApplied,
        });
      } else {
        res.render("resident/jobInfo", {
          user: req.session.resident,
          position,
        });
      }
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
    }
  },
  async saveApplication(req, res) {
    const { jobID } = req.params;
    try {
      const res_id = req.session.resident._id;

      // Check if the resident has already applied
      const hasApplied = await Jobs.findOne({
        _id: jobID,
        "applicants.resident_id": res_id, // Check if resident is already in the applicants array
      });
      const resident = await Resident.findById(res_id).lean();

      if (!hasApplied) {
        const job = await Jobs.findById(jobID).lean();
        // Add resident to the applicants array with additional fields
        const updatedJob = await Jobs.findByIdAndUpdate(
          jobID,
          {
            $addToSet: {
              applicants: {
                position: job.position,
                resident_id: resident._id,
                residentID: resident.residentID,
                residentName: `${resident.firstName} ${resident.lastName}`,
                facility: resident.facility,
                outDate: resident.outDate,
                custodyLevel: resident.custodyLevel,
                unitTeam: resident.unitTeam,
                jobPool: resident.jobPool,
                hireRequest: false,
                dateApplied: new Date(),
                interview: {
                  status: "none", // Ensure interview is a full object
                },
              },
            },
          },
          { new: true }
        );

        await createActivityLog(
          res_id,
          "submitted_application",
          `Submitted application to ${updatedJob.companyName}.`
        );

        const employerEmails = await getEmployeeEmails(updatedJob.companyName);

        //check if PI Contacts exist in this company and send notification
        if (employerEmails) {
          await sendNotificationsToEmployers(
            employerEmails,
            "application_submitted",
            `New job application submitted by resident #${resident.residentID}.`,
            `/employer/residentProfile/${resident.residentID}?activeTab=application`
          );
        }
      }

      res.redirect(`/resident/jobInfo/${jobID}`);
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
    }
  },
  async faq(req, res) {
    try {
      res.render("resident/faq", { user: req.session.resident });
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
    }
  },
  async recentActivities(req, res) {
    try {
      const res_id = req.session.resident._id.toString();
      const activities = await ActivityLog.find({ userID: res_id })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

      res.render(`resident/recentActivities`, {
        user: req.session.resident,
        activities,
      });
    } catch (err) {
      console.log(err);
      res.render("error/residentError/500");
    }
  },
};
