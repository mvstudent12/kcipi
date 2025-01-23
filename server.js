require("dotenv").config();
const dbURI = process.env.DB_URI;

const moment = require("moment");
const path = require("path");

//initializes express api
const express = require("express"); //uses express middleware
//initializes app with express
const app = express();

//initialize express-sessions
const session = require("express-session");
// This stores sessions in MongoDB
const MongoStore = require("connect-mongo");

app.use(
  session({
    secret: "onehandwashestheother", // Use a strong, unique secret key for session encryption
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        // "mongodb://localhost/kcipi"
        dbURI, // MongoDB URI
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
app.use(express.static("./app"));

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
