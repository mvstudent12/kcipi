const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");

const Admin = require("../models/Admin");
const Facility_Management = require("../models/Facility_Management");
const Classification = require("../models/Classification");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

//error handling
const { handleErrors } = require("../middleware/errorHandling");

module.exports = {
  //===============================================
  //======    Resident Auth Routes    =============
  //===============================================

  //renders resident login page
  async residentIndex(req, res) {
    req.session.destroy((err) => {
      if (err) {
        logger.warn("Failed to logout: " + err);
        return res.render("error/500");
      }
      res.clearCookie("connect.sid"); // Remove session cookie if using express-session
      res.render("auth/residentLogin");
    });
  },

  //checks if resident exists
  async residentLogin(req, res) {
    const residentID = req.body.residentID;

    try {
      const user = await Resident.findResident(residentID);
      req.session.resident = user;

      // Store IP and User-Agent after successful login
      req.session.ip = req.ip;
      req.session.userAgent = req.get("User-Agent");

      // Log successful login
      logger.info(
        `User logged in: #${req.session.resident.residentID}: ${req.session.resident.firstName}, ${req.session.resident.lastName}`
      );
      res.status(200).json({ user: "found" });
    } catch (err) {
      console.log(err);
      const errors = handleErrors(err);
      // Handles errors on front end
      res.status(400).json({ errors });
    }
  },

  //logs out resident users
  async residentLogOut(req, res) {
    // Log user logout
    logger.info(
      `Resident logged out: #${req.session.resident.residentID}: ${req.session.resident.firstName} ${req.session.resident.lastName} `
    );

    req.session.destroy((err) => {
      if (err) {
        logger.warn("Failed to logout: " + err);
        return res.render("error/500");
      }
    });
    res.clearCookie("connect.sid"); // Remove session cookie if using express-session
    res.redirect("/resident");
  },

  async thankYou(req, res) {
    res.render("clearance/thankYou");
  },

  //===============================================
  //======  Non-Resident Auth Routes    ===========
  //===============================================

  // renders non-resident login page
  async index(req, res) {
    req.session.destroy((err) => {
      if (err) {
        logger.warn("Failed to logout: " + err);
        return res.render("error/500");
      }
      res.clearCookie("connect.sid"); // Remove session cookie if using express-session
      res.render("auth/login");
    });
  },

  //checks if non-resident exists
  async login(req, res) {
    const { email, password } = req.body;
    try {
      // Check if the user exists in various schemas
      let user = await Employer.findOne({ email });
      if (!user) {
        user = await UnitTeam.findOne({ email });
      }
      if (!user) {
        user = await Admin.findOne({ email });
      }
      if (!user) {
        user = await Facility_Management.findOne({ email });
      }
      if (!user) {
        user = await Classification.findOne({ email });
      }

      // Check if user password matches
      if (user) {
        const auth = await bcrypt.compare(password, user.password);

        if (auth) {
          req.session.user = user;

          // Store IP and User-Agent after successful login
          req.session.ip = req.ip;
          req.session.userAgent = req.get("User-Agent");

          req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
            }
            // Log successful login
            logger.info(`User logged in: ${email}`);
            res.status(200).json({ user: user._id.toString() });
          });
        } else {
          // Log error for wrong password
          logger.info(`User attempted login: ${email}: wrong password`);
          throw Error("incorrect password");
        }
      } else {
        // Log error for non-existing email
        logger.info(`User attempted login: ${email}: wrong email`);
        throw Error("This email does not exist");
      }
    } catch (err) {
      console.log("There were errors in trying to log in: " + err);
      const errors = handleErrors(err);
      res.status(400).json({ errors });
    }
  },
  //serves non-resident user dashboard
  async userDashboard(req, res) {
    const id = req.params.id;

    try {
      let user = await Employer.findOne({ _id: id });

      if (!user) {
        user = await UnitTeam.findOne({ _id: id });
      }
      if (!user) {
        user = await Admin.findOne({ _id: id });
      }
      if (!user) {
        user = await Facility_Management.findOne({ _id: id });
      }
      if (!user) {
        user = await Classification.findOne({ _id: id });
      }

      res.redirect(`/${user.role}/dashboard`);
    } catch (err) {
      console.log(err);
      logger.warn("Unable to find user: ", err);
      res.render("error/403");
    }
  },

  //logs out non resident users
  async logOut(req, res) {
    // Log user logout
    logger.info(`Non-Resident logged out: ${req.session.user.email}`);
    req.session.destroy((err) => {
      if (err) {
        logger.warn("Failed to logout: " + err);
        return res.render("error/500");
      }
      res.clearCookie("connect.sid"); // Remove session cookie if using express-session
      res.redirect("/");
    });
  },
};
