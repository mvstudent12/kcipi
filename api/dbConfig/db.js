const mongoose = require("mongoose");
require("dotenv").config();

//const dbURI =
("mongodb+srv://kcicodingdev:WWsgMyk4wiBt3Vze@kcipi.vkftg.mongodb.net/?retryWrites=true&w=majority&appName=kcipi"); //for updating dummy data to atlas

//const dbURI = process.env.DB_URI; //for production

//const dbURI = "mongodb://localhost/kcipi"; //use for development

mongoose
  .connect(dbURI, {
    //comment these three out in localhost development vvv
    ssl: true, // Ensure SSL is enabled -comment out in development/localhost all three lines
    tls: true, // Force TLS connection
    tlsInsecure: false, // Optionally, enforce secure connection (recommended)
  })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("Error connecting to MongoDB Atlas:", err));

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

//Try this later for added features
// const mongoose = require("mongoose");

// const dbURI = process.env.DB_URI || "mongodb://localhost/kcipi";

// const connectWithRetry = async () => {
//   let retries = 3;
//   while (retries > 0) {
//     try {
//       await mongoose.connect(dbURI, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//         maxPoolSize: 50,
//         minPoolSize: 10,
//         serverSelectionTimeoutMS: 5000,
//         socketTimeoutMS: 45000,
//       });
//       console.log("✅ MongoDB Connected");
//       return;
//     } catch (err) {
//       console.error(
//         `❌ MongoDB connection failed. Retrying in 5 seconds... (${retries} attempts left)`
//       );
//       retries--;
//       await new Promise((res) => setTimeout(res, 5000));
//     }
//   }
//   console.error(
//     "❌ MongoDB connection failed after multiple attempts. Exiting..."
//   );
//   process.exit(1);
// };

// mongoose.connection.on("disconnected", () => {
//   console.log("⚠️ MongoDB disconnected! Attempting to reconnect...");
//   connectWithRetry();
// });

// if (process.env.NODE_ENV === "development") {
//   mongoose.set("debug", true);
// }

// module.exports = connectWithRetry;
