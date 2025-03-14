const {
  requestClearance,
} = require("../../api/controllers/clearanceControllers"); // Import the controller
const Resident = require("../../api/models/Resident");
const { createNotification } = require("../../api/utils/notificationUtils");
const {
  sendReviewEmail,
} = require("../../api/utils/emailUtils/notificationEmail");
const { createActivityLog } = require("../../api/utils/activityLogUtils");

jest.mock("../api/models/Resident"); // Mock Resident model
jest.mock("../api/utils/notificationUtils"); // Mock notification utils
jest.mock("../api/utils/emailUtils/notificationEmail"); // Mock email utils
jest.mock("../api/utils/activityLogUtils"); // Mock activity log utils

describe("requestClearance function", () => {
  let req, res;

  beforeEach(() => {
    // Mock console.error to suppress error logs during tests
    console.error = jest.fn();
    // Setup mock request and response
    req = {
      params: {
        residentID: "1234567",
        dept: "DW",
      },
      body: {
        recipient: "recipient@facility.com",
        comments: "Need clearance for job placement.",
      },
      session: {
        user: {
          _id: "user123",
          email: "unit@team.com",
          firstName: "John",
          lastName: "Doe",
        },
      },
    };

    res = {
      redirect: jest.fn(),
      render: jest.fn(),
    };

    // Mock the dependencies
    Resident.findOneAndUpdate.mockResolvedValue({
      residentID: "1234567",
      resume: {
        status: "approved",
        unitTeam: "unit@team.com",
      },
    });
    createNotification.mockResolvedValue(); // Mock notification creation
    sendReviewEmail.mockResolvedValue(); // Mock sendReviewEmail
    createActivityLog.mockResolvedValue(); // Mock activity log creation
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks after each test
  });

  it("should successfully request clearance, log activity, send notifications, and email", async () => {
    // Call the function
    await requestClearance(req, res);

    // Assertions
    expect(Resident.findOneAndUpdate).toHaveBeenCalledWith(
      { residentID: "1234567" },
      {
        $set: {
          "DWClearance.status": "pending",
        },
        $push: {
          "DWClearance.notes": {
            createdAt: expect.any(Date),
            createdBy: "John Doe",
            note: "Clearance request sent to recipient@facility.com.",
          },
        },
      },
      { new: true }
    );

    expect(createNotification).toHaveBeenCalledWith(
      "recipient@facility.com",
      "facility_management",
      "clearance_requested",
      "Clearance is requested for resident #1234567.",
      "/shared/residentProfile/1234567?activeTab=clearance"
    );

    expect(sendReviewEmail).toHaveBeenCalledWith(
      expect.any(Object), // resident object
      "DW", // department
      "recipient@facility.com", // recipient
      "unit@team.com", // sender
      "Need clearance for job placement.", // comments
      "request/reviewClearance/DW/1234567/recipient@facility.com"
    );

    expect(createActivityLog).toHaveBeenCalledWith(
      "user123", // user id
      "clearance_requested",
      "Requested DW clearance for #1234567."
    );

    expect(res.redirect).toHaveBeenCalledWith(
      "/shared/residentProfile/1234567?activeTab=clearance"
    );
  });

  it("should handle errors and render 500 page", async () => {
    // Simulate an error during the Resident update
    Resident.findOneAndUpdate.mockRejectedValue(new Error("Database error"));

    // Ensure console.error is properly mocked
    const consoleErrorMock = jest.spyOn(console, "error").mockImplementation();

    // Call the function
    await requestClearance(req, res);

    // Assertions
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "An error occurred when trying to request clearance approval via email: ",
      expect.any(Error)
    );
    expect(res.render).toHaveBeenCalledWith("error/500"); // Ensure error page is rendered

    // Clean up the mock after the test
    consoleErrorMock.mockRestore();
  });

  it("should send a notification to classification if department is Classification", async () => {
    // Change department to Classification
    req.params.dept = "Classification";

    // Call the function
    await requestClearance(req, res);

    // Assertions
    expect(createNotification).toHaveBeenCalledWith(
      "recipient@facility.com",
      "classification",
      "clearance_requested",
      "Clearance is requested for resident #1234567.",
      "/shared/residentProfile/1234567?activeTab=clearance"
    );
  });
  it("should send a notification to Deputy Warden if department is DW", async () => {
    // Change department to DW
    req.params.dept = "DW";

    // Call the function
    await requestClearance(req, res);

    // Assertions
    expect(createNotification).toHaveBeenCalledWith(
      "recipient@facility.com",
      "facility_management",
      "clearance_requested",
      "Clearance is requested for resident #1234567.",
      "/shared/residentProfile/1234567?activeTab=clearance"
    );
  });
  it("should send a notification to Warden if department is Warden", async () => {
    // Change department to Warden
    req.params.dept = "Warden";

    // Call the function
    await requestClearance(req, res);

    // Assertions
    expect(createNotification).toHaveBeenCalledWith(
      "recipient@facility.com",
      "facility_management",
      "clearance_requested",
      "Clearance is requested for resident #1234567.",
      "/shared/residentProfile/1234567?activeTab=clearance"
    );
  });

  it("should not send notification if department is not DW, Warden, or Classification", async () => {
    // Change department to something else
    req.params.dept = "OtherDepartment";

    // Call the function
    await requestClearance(req, res);

    // Assertions
    expect(createNotification).not.toHaveBeenCalled(); // Ensure no notification is sent
  });
});
