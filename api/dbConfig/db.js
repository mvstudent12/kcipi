const mongoose = require("mongoose");

const dbURI =
  //"mongodb+srv://kta-practice-portal:Employ-emotion3@kta-practice-portal.gieut4i.mongodb.net/kta-practice-portal?retryWrites=true&w=majority";

  "mongodb://localhost/kcipi"; //use for development
mongoose.connect(dbURI);

mongoose.connection.on("connected", () => {
  console.log(`Mongoose connected to ${dbURI}`);
});
mongoose.connection.on("error", (err) => {
  console.log("Mongoose connection error:", err);
});
mongoose.connection.on("disconnected", () => {
  console.log(" Mongoose disconnected");
});

//Graceful shutdown of connection
const gracefulShutdown = async (msg, callback) => {
  try {
    await mongoose.connection.close();
    console.log(`Mongoose disconnected through ${msg}`);
    callback();
  } catch (error) {
    console.error(`Error during mongoose shutdown: ${error.message}`);
    callback(error); // In case you want to handle the error
  }
};

// For app termination
process.on("SIGINT", () => {
  gracefulShutdown("app termination", () => {
    process.exit(0);
  });
});

// require("../models/User");
