require("dotenv").config(); //holds env variables
//const dbURI = process.env.DB_URI || "mongodb://localhost/kcipi";

const dbURI = process.env.DB_URI;

const path = require("path");
const express = require("express"); //initializes express api
const app = express(); //initializes app with express

//user logging functionality
const logger = require("./api/utils/logger");
const morgan = require("morgan");

// Define a regex pattern to ignore asset requests
const assetExtensions =
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map)$/i;

// Custom Morgan token to filter out assets
morgan.token("filtered-url", (req) => {
  return assetExtensions.test(req.url) ? null : req.url;
});

// Custom Morgan format that logs only non-asset requests
morgan.format(
  "custom",
  ":date[iso] [INFO] : :remote-addr :filtered-url :status :response-time ms"
);

// Morgan middleware to log non-asset requests
app.use(
  morgan("custom", {
    skip: (req, res) => {
      const logRoutes = ["/login", "/logout"];
      return (
        assetExtensions.test(req.url) || // Skip asset requests
        (!logRoutes.includes(req.path) && res.statusCode < 400) // Skip other routes unless an error occurs
      );
    },
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

const session = require("express-session"); //initialize express-sessions
const MongoStore = require("connect-mongo"); // This stores sessions in MongoDB
const crypto = require("crypto"); //generates random session secret

// Generate a random session secret dynamically
const generateSessionSecret = () => {
  return crypto.randomBytes(32).toString("hex"); // Generates a 64-character secret
};

// Use the generated session secret
//const sessionSecret = generateSessionSecret();

const sessionSecret = "asdasdasd8798798798279827342kmnikjn89s8ed0s8d";

console.log("Session Secret:", sessionSecret); // Log the secret for development (don't do this in production)

app.use(
  session({
    secret: sessionSecret, // Use a strong, unique secret key for session ,encryption
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: dbURI, // MongoDB URI
      collectionName: "sessions", // Collection name for storing sessions in MongoDB
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: false, //set true only in production
      httpOnly: true, // Set 'secure: true' if you're using HTTPS
      sameSite: "strict", // Helps prevent CSRF
    },
  })
);

//serves static assets
// ##Serve static files first, so they don't trigger session checks or redirects
app.use(express.static("./app", { maxage: "1d" }));

//initializes cookie parser
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//parses incoming data for readability
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true })); //for form submissions
app.use(bodyParser.json()); //for JSON requests

// Import xss-clean and use it globally
const xss = require("xss-clean");
app.use(xss()); // This will sanitize the request body, query, and params globally

//import routes
const authRoutes = require("./api/routes/authRoutes");

const residentRoutes = require("./api/routes/residentRoutes");
const unitTeamRoutes = require("./api/routes/unitTeamRoutes");
const adminRoutes = require("./api/routes/adminRoutes");
const facility_managementRoutes = require("./api/routes/facility_managementRoutes");
const classificationRoutes = require("./api/routes/classificationRoutes");
const employerRoutes = require("./api/routes/employerRoutes");
const clearanceRoutes = require("./api/routes/clearanceRoutes");
const requestRoutes = require("./api/routes/requestRoutes");
const notificationRoutes = require("./api/routes/notificationRoutes");

//links database api
require("./api/dbConfig/db");

//handlebars functions

const { engine } = require("express-handlebars");
const helpers = require("./api/helpers/helpers");
app.engine(
  "handlebars",
  engine({
    helpers: helpers,
    // Register the partials directory
    partialsDir: path.join(__dirname, "views/partials"),
    defaultLayout: "main",
  })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "/views"));
app.enable("view cache");

// Routes
app.use("/", authRoutes);

app.use("/resident", residentRoutes);
app.use("/unitTeam", unitTeamRoutes);
app.use("/admin", adminRoutes);
app.use("/facility_management", facility_managementRoutes);
app.use("/classification", classificationRoutes);
app.use("/employer", employerRoutes);
app.use("/request", requestRoutes);
app.use("/clearance", clearanceRoutes);
app.use("/notification", notificationRoutes);

//404 route
app.get("*", (req, res) => {
  res.render("error/404");
  logger.warn(`Page not found: ${req.originalUrl}`); // Log 404 errors
});

// interview cleanup
require("./api/cron/interviewCleanup");

//initialize server
const PORT = process.env.PORT || 5999;
app.listen(PORT, function () {
  console.log(`*****  KCI Private Industry is Running  *****`);
  console.log(`App listening on PORT ${PORT}`);
});

// For app termination
const gracefulShutdown = (msg, callback) => {
  console.log(`Application disconnected through ${msg}`);
  callback();
};
process.on("SIGINT", () => {
  gracefulShutdown("App termination", () => {
    process.exit(0);
  });
});
