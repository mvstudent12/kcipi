const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Employer = require("../models/Employer");
const Company = require("../models/Company");
const Jobs = require("../models/Jobs");

const mongoose = require("mongoose");

module.exports = {
  async dashboard(req, res) {
    try {
      const jobPool = req.session.resident.jobPool;
      const residentID = req.session.resident._id;

      if (jobPool) {
        //const jobs = await Jobs.find({ jobPool }).lean();

        const jobs = await Jobs.aggregate([
          {
            $match: {
              jobPool: jobPool, // Match jobs with the same jobPool as the resident
            },
          },
          {
            $addFields: {
              residentInApplicants: {
                $cond: {
                  if: {
                    $in: [
                      new mongoose.Types.ObjectId(residentID),
                      "$applicants",
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
        ]);
        console.log(jobs);
        const applicationCount = jobs.filter(
          (job) => job.residentInApplicants
        ).length;

        res.render("resident/dashboard", {
          user: req.session.resident,
          jobs,
          applicationCount,
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
    }
  },

  async profile(req, res) {
    try {
      //if resident has not completed a resume or has a resume rejected
      if (
        !req.session.resident.resumeIsComplete ||
        !req.session.resident.resumeRejectionReason
      ) {
        const unitTeam = await UnitTeam.find({
          facility: req.session.resident.facility,
        }).lean();
        res.render("resident/profile", {
          unitTeam,
          user: req.session.resident,
        });
      }
    } catch (err) {
      console.log(err);
    }
  },
  async saveResume(req, res) {
    const email = req.body.unitTeam;
    const id = req.session.resident._id.toString();
    try {
      //if resident is completing a resume for the first time
      if (email) {
        const unitTeam = await UnitTeam.findOne({ email }).lean();

        const unitTeamName = `${unitTeam.firstName} ${unitTeam.lastName}`;
        await Resident.updateOne(
          { _id: id },
          {
            $set: {
              resumeIsComplete: true,
              resume: req.body,
              unitTeam: unitTeamName,
            },
          }
        );
      } else {
        //if resident is correcting a rejected resume
        await Resident.updateOne(
          { _id: id },
          {
            $set: {
              resumeIsComplete: true,
              resume: req.body,
              resumeRejectionReason: "",
            },
          }
        );
      }

      let resident = await Resident.findOne({ _id: id }).lean();
      req.session.resident = resident;

      res.render("resident/profile", { user: req.session.resident });
    } catch (err) {
      console.log(err);
    }
  },
  async applications(req, res) {
    try {
      const residentID = req.session.resident._id;

      const appliedJobs = await Company.aggregate([
        {
          $unwind: "$jobs", // Unwind the jobs array to access each job
        },
        {
          $match: {
            "jobs.applicants": new mongoose.Types.ObjectId(residentID), // Match jobs where the resident is in applicants
          },
        },
        {
          $project: {
            _id: 0, // Optionally exclude the company _id from the result
            companyName: "$companyName", // Include the company name
            job: "$jobs", // Include the job details
            facility: "$facility",
          },
        },
      ]);

      res.render("resident/applications", {
        user: req.session.resident,
        appliedJobs,
      });
    } catch (err) {
      console.log(err);
    }
  },

  async jobInfo(req, res) {
    try {
      const { jobID } = req.params;
      const residentID = req.session.resident._id;

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
                  $in: [new mongoose.Types.ObjectId(residentID), "$applicants"],
                },
                then: true,
                else: false,
              },
            },
          },
        },
      ]);
      position = position[0];
      console.log(position);
      if (position.residentInApplicants) {
        const residentHasApplied = true;
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
    }
  },
  async saveApplication(req, res) {
    try {
      const { jobID } = req.params;
      const {
        firstName,
        lastName,
        residentID,
        custodyLevel,
        facility,
        outDate,
        workHistory,
        certifications,
        hsGraduate,
        companyName,
      } = req.body;

      const id = req.session.resident._id;
      //update resident document with application details
      await Resident.updateOne(
        { _id: id },
        {
          $push: {
            jobApplications: {
              firstName,
              lastName,
              residentID,
              custodyLevel,
              facility,
              outDate,
              workHistory,
              certifications,
              hsGraduate,
              companyName,
              position: jobID,
            },
          },
        }
      );

      await Jobs.findByIdAndUpdate(
        jobID,
        { $addToSet: { applicants: id } }, // Adds only if not present
        { new: true } // Returns the updated document
      );

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
                  $in: [new mongoose.Types.ObjectId(id), "$applicants"],
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
      res.render("resident/jobInfo", {
        user: req.session.resident,
        position,
        residentHasApplied,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async faq(req, res) {
    try {
      res.render("resident/faq", { user: req.session.resident });
    } catch (err) {
      console.log(err);
    }
  },
};
