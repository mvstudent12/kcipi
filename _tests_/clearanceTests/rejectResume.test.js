const { rejectResume } = require("../../api/controllers/clearanceControllers"); // Import the controller
const Resident = require("../../api/models/Resident");
const { createActivityLog } = require("../../api/utils/activityLogUtils");
const { createNotification } = require("../../api/utils/notificationUtils");

jest.mock("../api/models/Resident"); // Mock Resident model
jest.mock("../api/utils/activityLogUtils"); // Mock activity log utils
jest.mock("../api/utils/notificationUtils"); // Mock notification utils

describe("rejectResume function", () => {
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
        rejectReason: "Incomplete resume",
      },
      session: {
        user: {
          _id: "unitTeamId",
          email: "unit@team.com",
        },
      },
    };

    res = {
      redirect: jest.fn(),
      render: jest.fn(),
    };

    // Mock dependencies
    Resident.findOneAndUpdate.mockResolvedValue({
      _id: "residentId",
      residentID: "1234567",
      resume: {
        status: "rejected",
        rejectionReason: "Incomplete resume",
        unitTeam: "otherunit@team.com", // Changed to ensure notification is triggered
      },
    }); // Simulate successful resident update
    createActivityLog.mockResolvedValue(); // Mock activity log creation
    createNotification.mockResolvedValue(); // Mock notification creation
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks after each test
  });

  it("should successfully reject a resume, log activity, and notify the unit team", async () => {
    // Call the function
    await rejectResume(req, res);

    // Assertions
    expect(Resident.findOneAndUpdate).toHaveBeenCalledWith(
      { residentID: "1234567" },
      {
        $set: {
          "resume.status": "rejected",
          "resume.rejectionReason": "Incomplete resume",
        },
      },
      { new: true }
    );

    expect(createActivityLog).toHaveBeenCalledTimes(2); // Ensure activity log was created twice
    expect(createActivityLog).toHaveBeenCalledWith(
      "unitTeamId", // session user _id
      "resume_rejected",
      "Rejected resume for resident #1234567 for being Incomplete resume."
    );
    expect(createActivityLog).toHaveBeenCalledWith(
      "residentId", // resident _id
      "resume_rejected",
      "Resume rejected by Unit Team for being Incomplete resume."
    );

    expect(createNotification).toHaveBeenCalledWith(
      "otherunit@team.com", // The unitTeam should be notified (different email from session user)
      "unitTeam",
      "resume_rejected",
      "Resume rejected for resident #1234567 by unit@team.com.",
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
    await rejectResume(req, res);

    // Assertions
    expect(console.error).toHaveBeenCalledWith(
      "Error rejecting resident resume: ",
      expect.any(Error)
    );
    expect(res.render).toHaveBeenCalledWith("error/500"); // Ensure error page is rendered
  });

  it("should not send notification if the unit team is the same", async () => {
    // Modify req.session.user.email to match the unit team email in the resume
    req.session.user.email = "unit@team.com";

    // Simulate resident update with the same unit team email as session user
    Resident.findOneAndUpdate.mockResolvedValue({
      _id: "residentId",
      residentID: "1234567",
      resume: {
        status: "rejected",
        rejectionReason: "Incomplete resume",
        unitTeam: "unit@team.com", // Same email as session user
      },
    });

    // Call the function
    await rejectResume(req, res);

    // Ensure that createNotification is not called
    expect(createNotification).not.toHaveBeenCalled();
  });
});
