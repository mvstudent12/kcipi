function validateResidentID(residentID) {
  if (
    !residentID ||
    typeof residentID !== "string" ||
    !/^[0-9]{7}$/.test(residentID) // Ensures exactly 7 digits (0-9), no letters or symbols
  ) {
    throw new Error(
      "Invalid resident ID format. It must be a 7-digit number (0-9) with no letters or symbols."
    );
  }
}

module.exports = { validateResidentID };
