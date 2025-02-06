const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");
const Employer = require("../models/Employer");
const Company = require("../models/Company");
const Jobs = require("../models/Jobs");

const mongoose = require("mongoose");

module.exports = {
  async dashboard(req, res) {
    try {
      const workClearance = req.session.resident.workEligibility.status;
      const jobPool = req.session.resident.jobPool;
      const residentObjectId = req.session.resident._id;
      const residentID = req.session.resident.residentID;
      const facility = req.session.resident.facility;

      //if resident has been cleared to work
      if (workClearance === "approved") {
        //find all jobs in resident's job pool and facility
        const jobs = await Jobs.aggregate([
          {
            $match: {
              jobPool: jobPool, // Match jobs with the same jobPool as the resident
              facility: facility,
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
                        input: "$applicants",
                        as: "applicant",
                        cond: {
                          $eq: [
                            "$$applicant.resident_id",
                            new mongoose.Types.ObjectId(residentObjectId),
                          ],
                        },
                      },
                    },
                  },
                  0,
                ], // Returns true if at least one match is found
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
              "interviews.dateScheduled": 1, // Include the date field
              "interviews.time": 1, // Include the time field
              "interviews.instructions": 1, // Include the instructions field
              "interviews.isRequested": 1, // Include the isRequested field if needed
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
          $unwind: "$applicants", // Unwind the applicants array to access each applicant
        },
        {
          $match: {
            "applicants.resident_id": new mongoose.Types.ObjectId(id), // Match jobs where the resident's ID is in applicants.resident_id
          },
        },
        {
          $project: {
            _id: 0, // Optionally exclude the job's _id from the result
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
      const residentID = req.session.resident._id;

      // Check if the resident has already applied
      const job = await Jobs.findOne({
        _id: jobID,
        "applicants.resident_id": residentID, // Check if resident is already in the applicants array
      });

      if (!job) {
        // Add resident to the applicants array with additional fields
        await Jobs.findByIdAndUpdate(
          jobID,
          {
            $addToSet: {
              applicants: {
                resident_id: residentID,
                hireRequest: false,
                dateApplied: new Date(),
              },
            },
          },
          { new: true }
        );
      }

      // Re-fetch job with the updated data
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
                    new mongoose.Types.ObjectId(residentID),
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
