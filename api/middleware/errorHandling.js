//handle errors
const handleErrors = (err) => {
  console.log(err.message);
  let errors = {
    residentID: "",
  };

  //invalid non-resident email
  if (err.message === "incorrect password") {
    errors.password = "This is not the correct password.";
  }

  //invalid non-resident password
  if (err.message === "This email does not exist") {
    errors.email = "This email does not exist.";
  }

  //invalid residentID
  if (err.message === "residentID does not exist") {
    errors.residentID = "This resident ID is not registered.";
  }

  if (err.message.includes("resident validation failed")) {
    //validation errors
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }
  return errors;
};

module.exports = { handleErrors };
