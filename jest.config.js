module.exports = {
  testEnvironment: "node", // for express
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"], // This file can be used for any global setup
  // Handle unhandled promise rejections by failing the test
};
