const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Employer = require("../models/Employer");
const Company = require("../models/Company");

const mongoose = require("mongoose");

module.exports = {
  async dashboard(req, res) {
    try {
      const jobPool = req.session.resident.jobPool;
      const residentID = req.session.resident._id;
      if (jobPool) {
        const jobs = await Company.aggregate([
          {
            $unwind: "$jobs", // Unwind the jobs array
          },
          {
            $match: {
              "jobs.jobPool": jobPool, // Filter jobs by the specific jobPool
            },
          },
          {
            $project: {
              _id: 0, // Optionally exclude the company _id from the result
              companyName: "$companyName", // Assuming you have a company name field
              job: "$jobs", // Include the filtered job
              residentInApplicants: {
                $in: [
                  new mongoose.Types.ObjectId(residentID),
                  { $ifNull: ["$jobs.applicants", []] }, // Default to an empty array if applicants is missing
                ], // Check if residentId is in applicants array
              },
            },
          },
        ]);

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
        await Resident.updateOne(
          { _id: id },
          {
            $set: {
              resumeIsComplete: true,
              resume: req.body,
              unitTeam: unitTeam.lastName,
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
  async faq(req, res) {
    try {
      res.render("resident/faq", { user: req.session.resident });
    } catch (err) {
      console.log(err);
    }
  },
  async jobInfo(req, res) {
    try {
      //jobID
      const jobId = req.params.id;
      const residentID = req.session.resident._id;

      let position = await Company.aggregate([
        {
          $unwind: "$jobs", // Unwind the jobs array
        },
        {
          $match: {
            "jobs._id": new mongoose.Types.ObjectId(jobId),
          },
        },
        {
          $project: {
            _id: 0, // Optionally exclude the company _id from the result
            companyName: "$companyName", // Assuming you have a company name field
            job: "$jobs", // Include the filtered job
            facility: "$facility",
            residentInApplicants: {
              $in: [
                new mongoose.Types.ObjectId(residentID),
                { $ifNull: ["$jobs.applicants", []] }, // Default to an empty array if applicants is missing
              ], // Check if residentId is in applicants array
            },
          },
        },
      ]);

      position = position[0];

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
      const jobId = req.params.id;
      const {
        firstName,
        lastName,
        residentID,
        custodyLevel,
        facility,
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
              workHistory,
              certifications,
              hsGraduate,
              companyName,
              position: jobId,
            },
          },
        }
      );

      //update company schema
      const company = await Company.findOne({
        "jobs._id": jobId, // Find the company where the job with the given jobId exists
      });
      const jobIndex = company.jobs.findIndex(
        (job) => job._id.toString() === jobId
      );
      // Push the residentId into the applicants array for the found job
      company.jobs[jobIndex].applicants.push(id);

      // Save the updated company document
      await company.save();

      let position = await Company.aggregate([
        {
          $unwind: "$jobs", // Unwind the jobs array
        },
        {
          $match: {
            "jobs._id": new mongoose.Types.ObjectId(jobId),
          },
        },
        {
          $project: {
            _id: 0, // Optionally exclude the company _id from the result
            companyName: "$companyName", // Assuming you have a company name field
            job: "$jobs", // Include the filtered job
            facility: "$facility",
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
};
