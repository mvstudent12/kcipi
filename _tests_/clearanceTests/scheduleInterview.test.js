const mongoose = require("mongoose"); // Add this import for mongoose
const {
  scheduleInterview,
} = require("../../api/controllers/clearanceControllers");
const Jobs = require("../../api/models/Jobs");
const {
  getEmployeeEmails,
  sendNotificationsToEmployers,
} = require("../../api/utils/clearanceUtils");
const { createActivityLog } = require("../../api/utils/activityLogUtils");
const logger = require("../../api/utils/logger");

jest.mock("../api/models/Jobs");
jest.mock("../api/utils/clearanceUtils");
jest.mock("../api/utils/activityLogUtils");
jest.mock("../api/utils/logger");

describe("scheduleInterview", () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks before each test
    req = {
      params: { applicationID: "507f1f77bcf86cd799439011" },
      body: {
        date: "2025-03-20",
        time: "10:00 AM",
        instructions: "Bring your ID",
        residentID: "9876543",
      },
      session: { user: { _id: "user123" } },
    };

    res = {
      redirect: jest.fn(),
      render: jest.fn(),
    };

    // Reset the mock functions
    Jobs.findOneAndUpdate.mockReset();
    getEmployeeEmails.mockReset();
    sendNotificationsToEmployers.mockReset();
    createActivityLog.mockReset();
  });

  it("should schedule an interview successfully", async () => {
    // Mock successful update in Jobs model
    const mockInterview = {
      applicants: [
        {
          _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"), // Valid 24-character ObjectId
          residentID: "9876543",
          interview: {
            status: "scheduled",
            dateScheduled: "2025-03-20",
            time: "10:00 AM",
            instructions: "Bring your ID",
          },
        },
      ],
      companyName: "Example Company",
    };

    // Mocking the return value of Jobs.findOneAndUpdate
    Jobs.findOneAndUpdate.mockResolvedValue(mockInterview);
    getEmployeeEmails.mockResolvedValue(["employer@example.com"]);
    sendNotificationsToEmployers.mockResolvedValue(true);
    createActivityLog.mockResolvedValue(true);

    await scheduleInterview(req, res);

    // Add some debugging to check if the call is happening
    console.log(
      "findOneAndUpdate call count:",
      Jobs.findOneAndUpdate.mock.calls.length
    );

    // Test that the interview was successfully scheduled
    expect(Jobs.findOneAndUpdate).toHaveBeenCalledWith(
      {
        "applicants._id": new mongoose.Types.ObjectId(
          "507f1f77bcf86cd799439011"
        ),
      },
      {
        $set: {
          "applicants.$.interview.status": "scheduled",
          "applicants.$.interview.dateScheduled": "2025-03-20",
          "applicants.$.interview.time": "10:00 AM",
          "applicants.$.interview.instructions": "Bring your ID",
        },
      },
      { new: true }
    );

    expect(getEmployeeEmails).toHaveBeenCalledWith("Example Company");
    expect(sendNotificationsToEmployers).toHaveBeenCalledWith(
      ["employer@example.com"],
      "interview_scheduled",
      "New interview scheduled for resident #9876543.",
      "/employer/residentProfile/9876543?activeTab=application"
    );
    expect(createActivityLog).toHaveBeenCalledWith(
      "user123",
      "interview_scheduled",
      "Scheduled interview for resident #9876543 with Example Company."
    );
    expect(res.redirect).toHaveBeenCalledWith(
      "/shared/residentProfile/9876543?activeTab=application"
    );
  });

  it("should handle case when interview is not found", async () => {
    Jobs.findOneAndUpdate.mockResolvedValue(null); // No interview found

    await scheduleInterview(req, res);

    // Verify that an error was thrown and the 500 page is rendered
    expect(res.render).toHaveBeenCalledWith("error/500");
  });

  it("should handle errors during the process", async () => {
    Jobs.findOneAndUpdate.mockRejectedValue(new Error("Database error"));

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await scheduleInterview(req, res); // Ensure you're awaiting this async function call

    // Check that the error was logged and 500 page is rendered
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error scheduling interview:",
      expect.any(Error)
    );
    expect(res.render).toHaveBeenCalledWith("error/500");

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });
});
