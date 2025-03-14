const { findNotes } = require("../../api/controllers/clearanceControllers");
const Resident = require("../../api/models/Resident");

jest.mock("../api/models/Resident");
jest.mock("../api/utils/validationUtils");

describe("findNotes function", () => {
  let req, res;

  beforeEach(() => {
    req = { params: { residentID: "1234567", dept: "Medical" } };
    res = {
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    console.error = jest.fn(); // Mock console.error
  });

  it("should return notes when found", async () => {
    Resident.findOne.mockResolvedValue({
      MedicalClearance: { notes: ["Note 1", "Note 2"] },
    });

    await findNotes(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ notes: ["Note 1", "Note 2"] });
  });

  it("should return 404 if resident is not found", async () => {
    Resident.findOne.mockResolvedValue(null);

    await findNotes(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Resident not found." });
  });

  it("should return 404 if clearance is not found", async () => {
    Resident.findOne.mockResolvedValue({});

    await findNotes(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Medical clearance not found.",
    });
  });

  it("should render 500 page when a database error occurs", async () => {
    Resident.findOne.mockRejectedValue(new Error("Database error"));

    await findNotes(req, res);

    expect(res.render).toHaveBeenCalledWith("error/500");
    expect(console.error).toHaveBeenCalledWith(expect.any(Error));
  });
});
