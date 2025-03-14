const { editResident } = require("../../api/controllers/clearanceControllers"); // Import the controller
const Resident = require("../../api/models/Resident");
const { createActivityLog } = require("../../api/utils/activityLogUtils");
const { validateResidentID } = require("../../api/utils/validationUtils");

jest.mock("../api/models/Resident");
jest.mock("../api/utils/activityLogUtils");
jest.mock("../api/utils/validationUtils");

describe("editResident function", () => {
  let req, res;

  beforeEach(() => {
    // Mock console.error to suppress error logs during tests
    console.error = jest.fn();
    // Setup mock request and response
    req = {
      body: {
        residentID: "1234567",
        custodyLevel: "Medium",
        facility: "El Dorado",
        unitTeamInfo: "unit@team.com|Unit Team Name",
        jobPool: "Job Pool A",
      },
      session: {
        user: { _id: "user_id_123" }, // Mock session user
      },
    };

    res = {
      redirect: jest.fn(),
      render: jest.fn(),
    };

    // Mock dependencies
    validateResidentID.mockImplementation(() => {});
    Resident.findOneAndUpdate.mockResolvedValue(true); // Simulate successful update
    createActivityLog.mockResolvedValue(); // Mock activity log creation
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks after each test
  });

  it("should successfully edit a resident and log activity", async () => {
    // Call the function
    await editResident(req, res);

    // Assertions
    expect(validateResidentID).toHaveBeenCalledWith(req.body.residentID); // Ensure validation was called
    expect(Resident.findOneAndUpdate).toHaveBeenCalledWith(
      { residentID: req.body.residentID },
      {
        $set: {
          facility: req.body.facility,
          unitTeam: "Unit Team Name",
          custodyLevel: req.body.custodyLevel,
          jobPool: req.body.jobPool,
          "resume.unitTeam": "unit@team.com",
        },
      }
    );
    expect(createActivityLog).toHaveBeenCalledWith(
      req.session.user._id.toString(),
      "edited_user",
      `Edited resident #${req.body.residentID}.`
    );
    expect(res.redirect).toHaveBeenCalledWith(
      `/shared/residentProfile/${req.body.residentID}?activeTab=overview`
    );
  });

  it("should handle invalid unitTeamInfo and render an error page", async () => {
    // Modify the request with invalid unitTeamInfo (missing unitTeamName)
    req.body.unitTeamInfo = "invalidFormat"; // Invalid format

    // Call the function
    await editResident(req, res);

    // Assertions
    expect(res.render).toHaveBeenCalledWith("error/500"); // Ensure error page is rendered
  });

  it("should handle errors during Resident update and render an error page", async () => {
    // Simulate an error during the Resident update
    Resident.findOneAndUpdate.mockRejectedValue(new Error("Database Error"));

    // Call the function
    await editResident(req, res);

    // Assertions
    expect(res.render).toHaveBeenCalledWith("error/500"); // Ensure error page is rendered
  });
});
