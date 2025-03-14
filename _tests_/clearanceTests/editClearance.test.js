const { editClearance } = require("../../api/controllers/clearanceControllers");
const Resident = require("../../api/models/Resident");

const {
  createUpdateData,
  logClearanceActivity,
  sendClearanceNotification,
  checkClearanceStatus, // Make sure this is included
} = require("../../api/utils/clearanceUtils");

jest.mock("../api/models/Resident"); // Mock Resident model
jest.mock("../api/utils/notificationUtils"); // Mock notification utils
jest.mock("../api/utils/emailUtils/notificationEmail"); // Mock email utils
jest.mock("../api/utils/activityLogUtils"); // Mock activity log utils
jest.mock("../api/utils/clearanceUtils"); // Mock clearance utils

describe("editClearance function", () => {
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
        clearance: "true",
        comments: "Cleared for job placement.",
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
      status: jest.fn().mockReturnThis(), // Mock status to return `res` itself for chaining
    };

    // Mock the dependencies
    createUpdateData.mockReturnValue({
      $set: {
        "DWClearance.status": "approved",
        "DWClearance.notes": [
          {
            createdAt: expect.any(Date),
            createdBy: "John Doe",
            note: "Clearance updated: Cleared for job placement.",
          },
        ],
      },
    });
    logClearanceActivity.mockResolvedValue();
    checkClearanceStatus.mockResolvedValue("eligible"); // Ensure this is mocked
    sendClearanceNotification.mockResolvedValue();

    // Mock the Resident model
    Resident.findOneAndUpdate.mockResolvedValue({
      residentID: "1234567",
      resume: { unitTeam: "otherunit@team.com" }, // different unit for notification test
      workEligibility: { status: "eligible" },
      save: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks after each test
  });

  it("should successfully update clearance, log activity, and update work status", async () => {
    // Call the function
    await editClearance(req, res);

    // Assertions
    expect(Resident.findOneAndUpdate).toHaveBeenCalledWith(
      { residentID: "1234567" },
      {
        $set: {
          "DWClearance.status": "approved",
          "DWClearance.notes": [
            {
              createdAt: expect.any(Date),
              createdBy: "John Doe",
              note: "Clearance updated: Cleared for job placement.",
            },
          ],
        },
      },
      { new: true }
    );

    expect(logClearanceActivity).toHaveBeenCalledWith(
      "user123", // user id
      "true", // clearance status
      "DW", // department
      "1234567" // resident ID
    );

    expect(checkClearanceStatus).toHaveBeenCalledWith("1234567");

    expect(sendClearanceNotification).toHaveBeenCalledWith(
      expect.any(Object), // resident object
      "true", // clearance status
      "DW", // department
      "unit@team.com" // sender
    );

    expect(res.redirect).toHaveBeenCalledWith(
      "/shared/residentProfile/1234567?activeTab=clearance"
    );
  });

  it("should throw an error if clearance value is invalid", async () => {
    req.body.clearance = "invalid"; // Set invalid clearance value

    // Call the function
    await editClearance(req, res);

    // Assertions
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith("error/500", {
      error: "Invalid clearance value",
    });
  });

  it("should handle errors and render 500 page if something goes wrong", async () => {
    // Simulate an error during the Resident update
    Resident.findOneAndUpdate.mockRejectedValue(new Error("Database error"));

    // Ensure console.error is properly mocked
    const consoleErrorMock = jest.spyOn(console, "error").mockImplementation();

    // Call the function
    await editClearance(req, res);

    // Assertions
    expect(consoleErrorMock).toHaveBeenCalledWith(
      "Error updating clearance:", // Check the exact string "Error updating clearance:"
      "Database error" // Directly match the string error message
    );
    expect(res.status).toHaveBeenCalledWith(500); // Ensure status is set to 500
    expect(res.render).toHaveBeenCalledWith("error/500", {
      error: "Database error", // Pass the actual error message
    });

    // Clean up the mock after the test
    consoleErrorMock.mockRestore();
  });

  it("should send clearance notification if unit team is different from session user email", async () => {
    // Call the function
    await editClearance(req, res);

    // Assertions
    expect(sendClearanceNotification).toHaveBeenCalledWith(
      expect.any(Object), // resident object
      "true", // clearance status
      "DW", // department
      "unit@team.com" // sender
    );
  });
});
