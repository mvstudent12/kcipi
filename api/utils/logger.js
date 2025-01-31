const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

// List of asset file extensions to ignore in logs
const assetExtensions =
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map)$/i;

// Custom log format
const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level}] : ${message}`;
});

// Filter function to ignore asset requests
const ignoreAssets = winston.format((info) => {
  return assetExtensions.test(info.message) ? false : info;
});

// Create logger
const logger = winston.createLogger({
  level: "info", // Default log level for files
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat
  ),
  transports: [
    // Log to file with rotation, filtering out asset requests
    new DailyRotateFile({
      filename: "logs/%DATE%-app.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      zippedArchive: true,
      level: "info", // Log everything (info and above) to file
      format: winston.format.combine(ignoreAssets(), winston.format.json()),
    }),
    // Log only warnings and errors to the console, filtering out assets
    new winston.transports.Console({
      level: "warn", // Only logs "warn" and "error" messages to the console
      format: winston.format.combine(
        ignoreAssets(), // Apply filtering
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

module.exports = logger;
