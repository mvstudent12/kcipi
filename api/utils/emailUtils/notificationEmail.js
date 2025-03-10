const nodemailer = require("nodemailer");

const Link = require("../../models/Link");

// Setup your email transporter using your SMTP provider (e.g., Gmail, SendGrid, etc.)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "kcicodingdev@gmail.com",
    pass: "yzwa tkrs mola pkfs",
  },
});

//token generation to secure email links
const crypto = require("crypto");

function generateToken() {
  return crypto.randomBytes(20).toString("hex"); // 40-character hex token
}

//const DOMAIN = "localhost:5999"; //---> local development Only

const DOMAIN = "kcipi.onrender.com";

// Send an email notification to the next department
const sendReviewEmail = async (
  resident,
  department,
  recipient,
  sender,
  notes,
  route
) => {
  //create tokens for user security
  const token = generateToken();
  const tokenExpiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // Expires in 1 week

  // Save token and expiration in the database
  const linkData = new Link({
    email: recipient,
    token: token,
    tokenExpiration: tokenExpiration,
    used: false,
  });

  await linkData.save();

  const mailOptions = {
    from: `${sender}`,
    to: `${recipient}`,
    subject: `${department} Clearance for Private Industry: Resident #${resident.residentID}`,
    text: `${department} Clearance for Private Industry: Resident #${resident.residentID}`,
    html: `
<h2 style="font-size: 24px; font-weight: bold; color: #333;">
  Resident #${resident.residentID} - 
  <span style="text-transform: uppercase;">${resident.lastName}, ${resident.firstName}</span>
</h2>
<p style="font-size: 16px; color: #333;">
  We are awaiting approval to place this resident in a job.
</p> 
<h4 style="font-size: 18px; font-weight: bold; color: #333;">
  Please approve or deny clearance for this resident.
</h4>
<p style="color: blue; font-size: 14px; font-weight: bold;">
  ${notes}
</p>
<h4 style="font-size: 16px; font-weight: bold; color: #333;">
  Sent from: ${sender}
</h4>
      <p>
      
        <a href="http://${DOMAIN}/${route}?token=${token}"
           style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; text-align: center; font-weight: bold;">
          Review ${department} Clearance
        </a>
      </p>

      <p style="font-size: 14px; color: #333;">If you are unable to click the button, please copy and paste the following link into your browser:</p>
      <p style="font-size: 14px; color: #333;">
        <a href="http://${DOMAIN}/${route}?token=${token}" 
           style="color: #007BFF; text-decoration: none;">${department} Review Link</a>
      </p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipient}`);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};

const sendHelpDeskEmail = async (name, subject, sender, message, recipient) => {
  const mailOptions = {
    from: `${sender}`,
    to: `${recipient}`,
    subject: `${subject} from ${name}`,
    text: `Help Desk Ticket from ${name}.`,
    html: ` 
    <p>Issue:</p>
    <hr>   
    <p style="font-size: 16px;"><b>${message}</b></p>
    <hr>
    <p style="font-size: 16px; color: #333; text-transform: capitalize;">From ${name} at ${sender}</p>
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipient}`);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};

const sendContactEmail = async (name, subject, sender, message, recipient) => {
  const mailOptions = {
    from: `${sender}`,
    to: `${recipient}`,
    subject: `${subject} from ${name}`,
    text: `Contact Request from ${name}.`,
    html: ` 
    <hr>   
    <p style="font-size: 16px;">${message}</p>
    <hr>
    <p style="font-size: 16px; color: #333; text-transform: capitalize;">From ${name} at ${sender}</p>
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipient}`);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};

const sendRequestInterviewEmail = async (
  resident,
  companyName,
  recipient,
  sender,
  applicationID
) => {
  const mailOptions = {
    from: `${sender}`,
    to: `${recipient}`,
    subject: `KCI PI Resident Interview Requested`,
    text: `${companyName} is requesting an interview to be scheduled with #${resident.residentID}.`,
    html: `
      <h2 style="font-size: 24px; font-weight: bold; color: #333;">Resident #${resident.residentID} -<span style="text-transform: capitalize;">  ${resident.lastName}, ${resident.firstName}</span></h2>
      <p style="font-size: 16px; color: #333;"><span style="text-transform: capitalize;">${companyName}</span> is requesting an interview with resident #${resident.residentID} - <span style="text-transform: capitalize;">${resident.lastName}, ${resident.firstName}.</span></p> 
      <h4 style="font-size: 18px; font-weight: bold; color: #333;">Please review this request and schedule an interview for the appropriate time.</h4>
      <h4 style="font-size: 16px; font-weight: bold; color: #333;">Sent from: ${sender}</h4>
      
      <p>
      
        <a href="http://${DOMAIN}"
           style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; text-align: center; font-weight: bold;">
          Log In to Portal
        </a>
      </p>

      <p style="font-size: 14px; color: #333;">If you are unable to click the button, please copy and paste the following link into your browser:</p>
      <p style="font-size: 14px; color: #333;">
        <a href="http://${DOMAIN}" 
           style="color: #007BFF; text-decoration: none;"><span style="text-transform: capitalize;">${companyName}</span> KCI PI Portal</a>
      </p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipient}`);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};

const sendRequestHireEmail = async (
  resident,
  companyName,
  recipient,
  sender,
  applicationID
) => {
  const mailOptions = {
    from: `${sender}`,
    to: `${recipient}`,
    subject: `KCI PI Employment Request`,
    text: `${companyName} is requesting the employment of #${resident.residentID}.`,
    html: `
      <h2 style="font-size: 24px; font-weight: bold; color: #333;">Resident #${resident.residentID} -<span style="text-transform: capitalize;">  ${resident.lastName}, ${resident.firstName}</span></h2>
      <p style="font-size: 16px; color: #333;"><span style="text-transform: capitalize;">${companyName}</span> is requesting the employment of resident #${resident.residentID} - <span style="text-transform: capitalize;">${resident.lastName}, ${resident.firstName}.</span></p> 
      <h4 style="font-size: 18px; font-weight: bold; color: #333;">Please review this request. Thank you.</h4>
      <h4 style="font-size: 16px; font-weight: bold; color: #333;">Sent from: ${sender}</h4>
      
      <p>
      
        <a href="http://${DOMAIN}"
           style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; text-align: center; font-weight: bold;">
          Log In to Portal
        </a>
      </p>

      <p style="font-size: 14px; color: #333;">If you are unable to click the button, please copy and paste the following link into your browser:</p>
      <p style="font-size: 14px; color: #333;">
        <a href="http://${DOMAIN}" 
           style="color: #007BFF; text-decoration: none;"><span style="text-transform: capitalize;">${companyName}</span> KCI PI Portal</a>
      </p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`REquest Hire Email sent to ${recipient}`);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};

const sendTerminationRequestEmail = async (
  resident,
  companyName,
  recipient,
  sender
) => {
  const mailOptions = {
    from: `${sender}`,
    to: `${recipient}`,
    subject: `KCI PI Termination Request`,
    text: `${companyName} is requesting the termination of #${resident.residentID}.`,
    html: `
      <h2 style="font-size: 24px; font-weight: bold; color: #333;">Resident #${resident.residentID} -<span style="text-transform: capitalize;">  ${resident.lastName}, ${resident.firstName}</span></h2>
      <p style="font-size: 16px; color: #333;"><span style="text-transform: capitalize;">${companyName}</span> is requesting the termination of resident #${resident.residentID} - <span style="text-transform: capitalize;">${resident.lastName}, ${resident.firstName}.</span></p> 
      <h4 style="font-size: 18px; font-weight: bold; color: #333;">Please review this request. Thank you.</h4>
      <h4 style="font-size: 16px; font-weight: bold; color: #333;">Sent from: ${sender}</h4>
      
      <p>
      
        <a href="http://${DOMAIN}"
           style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; text-align: center; font-weight: bold;">
          Log In to Portal
        </a>
      </p>

      <p style="font-size: 14px; color: #333;">If you are unable to click the button, please copy and paste the following link into your browser:</p>
      <p style="font-size: 14px; color: #333;">
        <a href="http://${DOMAIN}" 
           style="color: #007BFF; text-decoration: none;"><span style="text-transform: capitalize;">${companyName}</span> KCI PI Portal</a>
      </p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Termination Email sent to ${recipient}`);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};

module.exports = {
  sendReviewEmail,
  sendHelpDeskEmail,
  sendContactEmail,
  sendRequestInterviewEmail,
  sendRequestHireEmail,
  sendTerminationRequestEmail,
};
