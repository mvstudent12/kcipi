const handleErrors = (err) => {
  console.log(err.message);

  let errors = { residentID: "" };

  // Handle specific errors
  if (err.message === "incorrect password") {
    errors.password = "This is not the correct password.";
  }
  if (err.message === "This email does not exist") {
    errors.email = "This email does not exist.";
  }
  if (err.message === "residentID does not exist") {
    errors.residentID = "This resident ID is not registered.";
  }

  // Handle Mongoose validation errors
  if (err.message.includes("resident validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  // Return errors for known issues, otherwise default to a 500 error
  return Object.keys(errors).length > 1
    ? errors
    : { message: "An unexpected error occurred. Please try again." };
};

module.exports = { handleErrors };
