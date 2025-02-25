// sessionSecurity.js
module.exports = (req, res, next) => {
  // Check IP and User-Agent
  if (
    req.session.ip !== req.ip ||
    req.session.userAgent !== req.get("User-Agent")
  ) {
    return res.render("error/403");
  }
  next(); // Proceed if everything matches
};
