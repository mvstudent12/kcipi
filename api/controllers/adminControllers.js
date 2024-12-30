const Admin = require("../models/Admin");
const Employer = require("../models/Employer");
const UnitTeam = require("../models/UnitTeam");
const Resident = require("../models/Resident");

// require("dotenv").config(); // Load environment variables
// const nodemailer = require("nodemailer");

// // Set up the transporter using Gmail (you can use any SMTP server)
// const transporter = nodemailer.createTransport({
//   service: "gmail", // You can use 'gmail', 'sendgrid', etc.
//   auth: {
//     user: "kcicodingdev@gmail.com", // Your email address from environment variables
//     pass: "yzwa tkrs mola pkfs ", // Your email password from environment variables
//   },
// });

// // Function to send email
// const sendEmail = (to, subject, text, html) => {
//   const mailOptions = {
//     from: "kcicodingdev@gmail.com", // Sender's email address
//     to: "carrie.branson@ks.gov", // Recipient email address
//     subject: "test from voorhees", // Subject of the email
//     text: "this is a test from voorhees", // Plain text body
//   };

//   // Send the email
//   transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//       console.log("Error occurred:", error);
//     } else {
//       console.log("Email sent:", info.response);
//     }
//   });
// };
// sendEmail();
module.exports = {
  //serves admin dashboard from admin portal
  async dashboard(req, res) {
    try {
      const residents = await Resident.find().lean();

      res.render("admin/dashboard", { residents, user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
  //serves resident profile with their resume
  async residentProfile(req, res) {
    try {
      const id = req.params.id;
      const resident = await Resident.findOne({ residentID: id }).lean();
      res.render("admin/residentProfile", { resident, user: req.session.user });
    } catch (err) {
      console.log(err);
    }
  },
};
