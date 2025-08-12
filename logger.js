// logger.js
const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "server.log");

function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

function logRequest(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logMsg = `REQUEST: ${req.method} ${req.originalUrl} | STATUS: ${res.statusCode} | DURATION: ${duration}ms | IP: ${req.ip}`;
    logToFile(logMsg);
    console.log(logMsg);
  });
  next();
}

function logError(err, req, res, next) {
  const logMsg = `ERROR: ${req.method} ${req.originalUrl} | STATUS: ${res.statusCode} | MESSAGE: ${err.message} | STACK: ${err.stack}`;
  logToFile(logMsg);
  console.error(logMsg);
  next(err);
}

module.exports = { logRequest, logError };
