const bcrypt = require("bcryptjs");

const Admin = require("../models/Admin");
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
        return res.status(500).send("Failed to logout");
      }
      res.render("auth/residentLogin");
    });
  },

  //checks if resident exists
  async residentLogin(req, res) {
    const residentID = req.body.residentID;

    try {
      const user = await Resident.findResident(residentID);

      req.session.resident = user;
      console.log("resident login session " + req.session.resident);
      res.status(200).json({ user: "found" });
    } catch (err) {
      console.log(err);
      const errors = handleErrors(err);
      res.status(400).json({ errors });
    }
  },

  //logs out resident users
  async residentLogOut(req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Failed to logout");
      }
    });
    res.redirect("/auth/residentLogin");
  },

  //===============================================
  //======  Non-Resident Auth Routes    ===========
  //===============================================

  // renders non-resident login page
  async index(req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Failed to logout");
      }
      res.render("auth/login");
    });
  },

  //checks if non-resident exists
  async login(req, res) {
    const { email, password } = req.body;
    try {
      //check if the user exists in various schemas
      let user = await Employer.findOne({ email });
      if (!user) {
        user = await UnitTeam.findOne({ email });
      }
      if (!user) {
        user = await Admin.findOne({ email });
      }

      if (user) {
        const userID = user._id.toString();
        const auth = await bcrypt.compare(password, user.password);

        if (auth) {
          req.session.user = user;
          console.log(user);

          res.status(200).json({ user: userID });
        } else {
          //if password does not match
          throw Error("incorrect password");
        }
      } else {
        //if no user found
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

      res.redirect(`/${user.role}/dashboard`);
    } catch (err) {
      console.log(err);
    }
  },

  //logs out non resident users
  async logOut(req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Failed to logout");
      }
      res.render("auth/login");
    });
  },
};
