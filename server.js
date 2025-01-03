require("dotenv").config();

const moment = require("moment");
const path = require("path");

//initializes express api
const express = require("express"); //uses express middleware
//initializes app with express
const app = express();

//serves static assets
// Serve static files first, so they don't trigger session checks or redirects
app.use(express.static("./app"));

//initialize express-sessions
const session = require("express-session");
// This stores sessions in MongoDB
const MongoStore = require("connect-mongo");

app.use(
  session({
    secret: "your-secret-key", // Use a strong, unique secret key for session encryption
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        // "mongodb://localhost/kcipi"
        "mongodb+srv://kcicodingdev:WWsgMyk4wiBt3Vze@kcipi.vkftg.mongodb.net/?retryWrites=true&w=majority&appName=kcipi", // MongoDB URI
      collectionName: "sessions", // Collection name for storing sessions in MongoDB
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: false,
      httpOnly: true, // Set 'secure: true' if you're using HTTPS
      sameSite: "strict", // Helps prevent CSRF
    },
  })
);

// Middleware to check session data (for testing)
// app.use((req, res, next) => {
//   console.log(`${req.method} request to ${req.originalUrl}`);
//   console.log("Session Data:", req.session);
//   next();
// });

//initializes cookie parser
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//parses incoming data for readability
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true })); //for form submissions
app.use(bodyParser.json()); //for JSON requests

//import routes
const authRoutes = require("./api/routes/authRoutes");
const residentRoutes = require("./api/routes/residentRoutes");
const unitTeamRoutes = require("./api/routes/unitTeamRoutes");
const adminRoutes = require("./api/routes/adminRoutes");
const employerRoutes = require("./api/routes/employerRoutes");
const clearanceRoutes = require("./api/routes/clearanceRoutes");
const notificationRoutes = require("./api/routes/notificationRoutes");

//links database api
require("./api/dbConfig/db");

//handlebars functions

const { engine } = require("express-handlebars");

app.engine(
  "handlebars",

  engine({
    helpers: {
      countArrayItems: (array) => {
        if (!array) {
          return 0;
        }
        return array.length;
      },
      countPendingItems: (array, x, y) => {
        let count = 0;
        array.forEach((item) => {
          const condition1 = item[x];
          const condition2 = item[y];

          if ((condition1 && !condition2) || (!condition1 && condition2)) {
            count++;
          }
        });

        return count;
      },
      add: (value, increment) => {
        return value + increment;
      },
      countNestedTrue: (array, key) => {
        if (!Array.isArray(array)) return 0; // Check if it's an array
        return array.filter(
          (item) =>
            item[key] === true ||
            item[key] === "inappropriate" ||
            item[key] === "inaccurate"
        ).length; // Count nested objects with false value
      },
      countNestedFalse: (array, key) => {
        if (!Array.isArray(array)) return 0; // Check if it's an array
        return array.filter((item) => item[key] === false).length; // Count nested objects with false value
      },
      countItems: (array) => {
        return Array.isArray(array) ? array.length : 0; // Check if it's an array
      },
      eq: (a, b) => a === b,
      formatDate: (date) => {
        return moment(date).format("MM/D/YY");
      },
    },
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
app.use("/employer", employerRoutes);
app.use("/notification", notificationRoutes);
app.use("/clearance", clearanceRoutes);

app.get("*", (req, res) => {
  //serves 404 error page
  res.render("error");
});

//initializes server
const PORT = process.env.PORT || 5999;
app.listen(PORT, function () {
  console.log(`*****  KCI Private Industry is Running  *****
    App listening on PORT ${PORT}`);
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
