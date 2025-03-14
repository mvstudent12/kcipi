const { approveResume } = require("../../api/controllers/clearanceControllers"); // Import the controller
const Resident = require("../../api/models/Resident");
const { createActivityLog } = require("../../api/utils/activityLogUtils");
const { createNotification } = require("../../api/utils/notificationUtils");

jest.mock("../api/models/Resident"); // Mock Resident model
jest.mock("../api/utils/activityLogUtils"); // Mock activity log utils
jest.mock("../api/utils/notificationUtils"); // Mock notification utils

describe("approveResume function", () => {
  let req, res;

  beforeEach(() => {
    // Mock console.error to suppress error logs during tests
    console.error = jest.fn();

    // Setup mock request and response
    req = {
      params: {
        residentID: "1234567",
      },
      body: {
        jobPool: "Job Pool A",
      },
      session: {
        user: {
          _id: "unitTeamId",
          email: "unit@team.com", // Mock session user email
          firstName: "John",
          lastName: "Doe",
        },
      },
    };

    res = {
      redirect: jest.fn(),
      render: jest.fn(),
    };

    // Mock dependencies
    const resident = {
      _id: "residentId",
      residentID: "1234567",
      resume: {
        status: "approved",
        unitTeam: "anotherunit@team.com", // Different email from session user
      },
    };
    Resident.findOneAndUpdate.mockResolvedValue(resident); // Mock resident update
    createActivityLog.mockResolvedValue(); // Mock activity log creation
    createNotification.mockResolvedValue(); // Mock notification creation
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks after each test
  });

  it("should successfully approve a resume, log activity, and notify the unit team", async () => {
    // Call the function
    await approveResume(req, res);

    // Assertions
    expect(Resident.findOneAndUpdate).toHaveBeenCalledWith(
      { residentID: "1234567" },
      {
        $set: {
          "resume.status": "approved",
          "resume.approvedBy": "John Doe",
          "resume.approvalDate": expect.any(Date),
          jobPool: "Job Pool A",
        },
      },
      { new: true }
    );

    expect(createActivityLog).toHaveBeenCalledTimes(2); // Ensure activity log was created twice
    expect(createActivityLog).toHaveBeenCalledWith(
      "unitTeamId", // session user _id
      "resume_approved",
      "Approved resume for resident #1234567."
    );
    expect(createActivityLog).toHaveBeenCalledWith(
      "residentId", // resident _id
      "resume_approved",
      "Resume approved by Unit Team."
    );

    expect(createNotification).toHaveBeenCalledWith(
      "anotherunit@team.com", // unitTeam email from resume
      "unitTeam",
      "resume_approved",
      "Resume approved for resident #1234567 by unit@team.com.",
      "/shared/residentProfile/1234567?activeTab=resume"
    );

    expect(res.redirect).toHaveBeenCalledWith(
      "/shared/residentProfile/1234567?activeTab=resume"
    );
  });

  it("should handle errors and render 500 page", async () => {
    // Simulate an error during the Resident update
    Resident.findOneAndUpdate.mockRejectedValue(new Error("Database error"));

    // Call the function
    await approveResume(req, res);

    // Assertions
    expect(console.error).toHaveBeenCalledWith(
      "Error approving resident resume: ",
      expect.any(Error)
    );
    expect(res.render).toHaveBeenCalledWith("error/500"); // Ensure error page is rendered
  });

  it("should not send notification if the unit team is the same", async () => {
    // Modify req.session.user.email to match the unit team email in the resume
    req.session.user.email = "anotherunit@team.com"; // Ensure this matches the resume's unitTeam email

    // Call the function
    await approveResume(req, res);

    // Ensure that createNotification is not called
    expect(createNotification).not.toHaveBeenCalled();
  });
});
