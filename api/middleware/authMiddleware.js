const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

// Middleware to require authentication for non-residents
async function requireAuth(req, res, next) {
  if (!req.session.user && req.originalUrl !== "/") {
    return res.redirect("/"); // Redirect if no user is found in session
  }
  next(); // Proceed if the user is authenticated
}

// Middleware to require authentication for residents
async function requireResidentAuth(req, res, next) {
  if (!req.session.resident && req.originalUrl !== "/resident") {
    return res.redirect("/resident"); // Redirect if no user is found in session
  }
  next(); // Proceed if the resident is authenticated
}

// Middleware to check user details and store it in res.session
const checkUser = async (req, res, next) => {
  //console.log("checkUser has been called");

  // Check if user session exists
  const user = req.session.user;

  if (!user) {
    // No session found (user is not logged in)
    req.session.user = null; // Explicitly set to null (in case there's old session data)
    // console.log("No user session found: user set to null");
    return next(); // Proceed to next middleware or route handler
  }

  try {
    // If the session exists, simply attach the user to the request object
    //console.log("User found in session:", user);

    // You could optionally add extra checks to make sure the user data is still valid
    // Example: Find the user in the database (e.g., if user session data is outdated)
    const foundUser = await findUserById(user); // Example to find user by ID from session data

    if (foundUser) {
      req.session.user = foundUser; // Store the found user in session

      //console.log("User found in database:", foundUser);
    } else {
      req.session.user = null; // If user not found in database, clear session
      console.log("User not found in database: session set to null");
    }

    next(); // Proceed to next middleware or route handler
  } catch (err) {
    // Handle any error (e.g., database error or session access issues)
    console.log("checkUser error:", err.message);
    req.session.user = null; // Clear session if any error occurs
    next(); // Proceed anyway
  }
};

const checkResident = async (req, res, next) => {
  // Check if user session exists
  const resident = req.session.resident;

  if (!resident) {
    // No session found (user is not logged in)
    req.session.resident = null; // Explicitly set to null (in case there's old session data)
    // console.log("No user session found: user set to null");
    return next(); // Proceed to next middleware or route handler
  }

  try {
    // If the session exists, simply attach the user to the request object
    // console.log("User found in session:", resident);

    // You could optionally add extra checks to make sure the user data is still valid
    // Example: Find the user in the database (e.g., if user session data is outdated)
    const foundResident = await findUserById(resident); // Example to find user by ID from session data

    if (foundResident) {
      req.session.resident = foundResident; // Store the found Resident in session
      // console.log("Resident found in database:", foundResident);
    } else {
      req.session.resident = null; // If user not found in database, clear session
      console.log("Resident not found in database: session set to null");
    }

    next(); // Proceed to next middleware or route handler
  } catch (err) {
    // Handle any error (e.g., database error or session access issues)
    console.log("checkResident error:", err.message);
    req.session.resident = null; // Clear session if any error occurs
    next(); // Proceed anyway
  }
};

// Helper function to find the user in the models
async function findUserById(userId) {
  const user =
    (await Admin.findById(userId).lean()) ||
    (await UnitTeam.findById(userId).lean()) ||
    (await Employer.findById(userId).lean()) ||
    (await Resident.findById(userId).lean());
  return user;
}

module.exports = { requireAuth, checkUser, requireResidentAuth, checkResident };
