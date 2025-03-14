const { addNotes } = require("../../api/controllers/clearanceControllers");
const Resident = require("../../api/models/Resident");
const { createActivityLog } = require("../../api/utils/activityLogUtils");
const { validateResidentID } = require("../../api/utils/validationUtils");
const { mapDepartmentName } = require("../../api/utils/requestUtils");
const logger = require("../../api/utils/logger");

jest.mock("../api/models/Resident");
jest.mock("../api/utils/activityLogUtils");
jest.mock("../api/utils/validationUtils");
jest.mock("../api/utils/requestUtils");
jest.mock("../api/utils/logger");

describe("addNotes function", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { residentID: "1234567", dept: "Medical" },
      body: { notes: "This is a test note." },
      session: { user: { firstName: "John", lastName: "Doe", _id: "user123" } },
    };
    res = {
      redirect: jest.fn(),
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    console.error = jest.fn();
  });

  it("should successfully add a note and redirect", async () => {
    mapDepartmentName.mockReturnValue("Medical");
    Resident.updateOne.mockResolvedValue({ modifiedCount: 1 });
    createActivityLog.mockResolvedValue();

    await addNotes(req, res);

    expect(validateResidentID).toHaveBeenCalledWith("1234567");
    expect(mapDepartmentName).toHaveBeenCalledWith("Medical");
    expect(Resident.updateOne).toHaveBeenCalledWith(
      { residentID: "1234567" },
      {
        $push: {
          ["MedicalClearance.notes"]: {
            createdAt: expect.any(Date),
            createdBy: "John Doe",
            note: "This is a test note.",
          },
        },
      }
    );
    expect(createActivityLog).toHaveBeenCalledWith(
      "user123",
      "note_added",
      "Added note to resident #1234567 clearance notes."
    );
    expect(res.redirect).toHaveBeenCalledWith(
      "/shared/residentProfile/1234567?activeTab=clearance"
    );
  });

  it("should render 500 page on error", async () => {
    mapDepartmentName.mockImplementation(() => {
      throw new Error("Mapping error");
    });

    await addNotes(req, res); // Call function first

    expect(logger.warn).toHaveBeenCalledWith(
      "An error occurred while adding resident notes: ",
      expect.any(Error)
    );

    expect(console.error).toHaveBeenCalledWith(expect.any(Error));
    expect(res.render).toHaveBeenCalledWith("error/500");
  });
});
