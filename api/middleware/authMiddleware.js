const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

const logger = require("../utils/logger");

// Middleware to ensure a user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/"); // Redirect if not logged in
  }
  next();
}

// Middleware to ensure a resident is authenticated
function requireResidentAuth(req, res, next) {
  if (!req.session.resident) {
    return res.redirect("/resident"); // Redirect if not logged in
  }
  next();
}

// Middleware to check if the user has a specific role
function requireRole(allowedRoles) {
  return async (req, res, next) => {
    if (!req.session.user) {
      return res.redirect("/"); // Redirect if no user session
    }

    try {
      // Fetch user details if not already in session
      let user = req.session.user;
      if (!user.role) {
        user = await findUserById(user._id); // Get user from database
        if (!user) {
          req.session.user = null;
          return res.redirect("/");
        }
        req.session.user = user; // Store updated user in session
      }

      // Check if user has an allowed role
      if (!allowedRoles.includes(user.role)) {
        logger.info(`Role check error:: ${user.role}::Access denied.`);
        //maybe make this 404 page later
        return res.status(403).send("Access denied."); // Forbidden if role mismatch
      }

      next();
    } catch (err) {
      console.error("Role check error:", err.message);
      logger.info(`Role check error:: ${err.message}`);
      res.status(500).send("Internal server error");
    }
  };
}

// Middleware to store user details in session
const checkUser = async (req, res, next) => {
  if (!req.session.user) {
    req.session.user = null;
    return next();
  }

  try {
    const user = await findUserById(req.session.user._id);
    req.session.user = user || null;
    next();
  } catch (err) {
    console.error("checkUser error:", err.message);
    req.session.user = null;
    next();
  }
};

// Middleware to store resident details in session
const checkResident = async (req, res, next) => {
  if (!req.session.resident) {
    req.session.resident = null;
    return next();
  }

  try {
    const resident = await findUserById(req.session.resident._id);
    req.session.resident = resident || null;
    next();
  } catch (err) {
    console.error("checkResident error:", err.message);
    req.session.resident = null;
    next();
  }
};

// Helper function to find the user in the models
async function findUserById(userId) {
  return (
    (await Admin.findById(userId).lean()) ||
    (await UnitTeam.findById(userId).lean()) ||
    (await Employer.findById(userId).lean()) ||
    (await Resident.findById(userId).lean())
  );
}

module.exports = {
  requireAuth,
  requireResidentAuth,
  requireRole,
  checkUser,
  checkResident,
};
