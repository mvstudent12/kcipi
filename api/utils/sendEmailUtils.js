const nodemailer = require("nodemailer");

// Setup your email transporter using your SMTP provider (e.g., Gmail, SendGrid, etc.)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "kcicodingdev@gmail.com",
    pass: "yzwa tkrs mola pkfs",
  },
});

// Send an email notification to the next department
const sendReviewEmail = async (
  resident,
  department,
  recipient,
  sender,
  notes
) => {
  const mailOptions = {
    from: `${sender}`,
    to: `${recipient}`,
    subject: `${department} Clearance for Private Industry: ${resident.lastName}, ${resident.firstName} #${resident.residentID}`,
    text: `${department} clearance is needed for resident #${resident.residentID} and is awaiting approval from ${department}. Please review.`,
    html: `
      <h2>Resident #${resident.residentID} - ${resident.lastName}, ${resident.firstName}</h2>
      <p>We are awaiting approval from ${department} to place this resident in a job.</p> 
      <h4>Please approve or deny clearance for this resident.</h4>
      <p style="color: blue; font-size: 14px; font-weight: bold;">${notes}</p>
      <h4>Sent from: ${sender}<h4>
     <p>
      <a href="http://localhost:5888/notification/review/${department}/${resident.residentID}/${sender}"
         style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; text-align: center; font-weight: bold;">
        Review ${department} Clearance
      </a>
     </p>
     <p>If you are unable to click the button, please copy and paste the following link into your browser:</p>
    <p><a href="http://localhost:5888/notification/review/${department}/${resident.residentID}/${sender}">${department} Review Link</a></p>
 
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipient}`);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};

module.exports = {
  sendReviewEmail,
};

//  <p><strong>Skills:</strong> ${resume.skills.join(", ")}</p>
//   <p><strong>Experience:</strong> ${resume.experience.join(", ")}</p>
//   <p><a href="/resumes/${resume._id}">View Resume</a></p>
