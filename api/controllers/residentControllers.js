const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Employer = require("../models/Employer");
const Company = require("../models/Company");
const Jobs = require("../models/Jobs");

const mongoose = require("mongoose");
const { residentTables } = require("./adminControllers");

module.exports = {
  async dashboard(req, res) {
    try {
      const jobPool = req.session.resident.jobPool;
      const id = req.session.resident._id;
      const residentID = req.session.resident.residentID;

      //if resident has an approved resume, find jobs
      if (jobPool) {
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
                    $in: [new mongoose.Types.ObjectId(id), "$applicants"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
        ]);
        const applicationCount = jobs.filter(
          (job) => job.residentInApplicants
        ).length;

        //check for interviews
        const interviews = await Jobs.aggregate([
          {
            $match: {
              "interviews.residentID": residentID, // Match documents where interviews contain the specified residentID
            },
          },
          {
            $project: {
              _id: 0, // Exclude the document's ObjectId
              companyName: 1, // Include company name
              position: 1, // Include position
              interviews: {
                $filter: {
                  input: "$interviews",
                  as: "interview",
                  cond: { $eq: ["$$interview.residentID", residentID] }, // Filter interviews by residentID
                },
              },
            },
          },
          {
            $unwind: "$interviews", // Deconstruct the filtered interviews array into individual objects
          },
          {
            $project: {
              companyName: 1, // Include company name
              position: 1, // Include position
              "interviews.date": 1, // Include the date field
              "interviews.time": 1, // Include the time field
              "interviews.instructions": 1, // Include the instructions field
            },
          },
        ]);

        console.log(interviews);

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
    }
  },

  async profile(req, res) {
    try {
      const unitTeam = await UnitTeam.find({
        facility: req.session.resident.facility,
      }).lean();
      res.render("resident/profile", {
        unitTeam,
        user: req.session.resident,
      });
    } catch (err) {
      console.log(err);
    }
  },
  async saveResume(req, res) {
    const email = req.body.unitTeam;
    const id = req.session.resident._id.toString();
    try {
      const unitTeam = await UnitTeam.findOne({ email }).lean();

      const unitTeamName = `${unitTeam.firstName} ${unitTeam.lastName}`;
      await Resident.updateOne(
        { _id: id },
        {
          $set: {
            resumeIsComplete: true,
            resume: req.body,
            unitTeam: unitTeamName,
            resumeRejectionReason: "",
          },
        }
      );

      let resident = await Resident.findOne({ _id: id }).lean();
      req.session.resident = resident;
      res.render("resident/profile", { user: req.session.resident });
    } catch (err) {
      console.log(err);
    }
  },

  async applications(req, res) {
    try {
      const id = req.session.resident._id;

      const appliedJobs = await Jobs.aggregate([
        {
          $unwind: "$applicants", // Unwind the applicants array to access each job
        },
        {
          $match: {
            applicants: new mongoose.Types.ObjectId(id), // Match jobs where the resident is in applicants
          },
        },
        {
          $project: {
            _id: 0, // Optionally exclude the company _id from the result
            companyName: "$companyName", // Include the company name
            pay: "$pay", // Include the job details
            position: "$position",
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
      const id = req.session.resident._id;

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

      const id = req.session.resident._id;

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
