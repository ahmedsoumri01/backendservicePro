const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

const authMiddleware = async (req, res, next) => {
  try {
    let token = req.header("Authorization").split(" ")[1];

    if (!token) {
      console.error("** No token provided. ** ");
      return res
        .status(401)
        .json({ message: "Access Denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password"); // Attach user data to request
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid Token" });
  }
};
// Middleware to check if user is a worker
const workerMiddleware = (req, res, next) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({ message: "Access denied. Workers only." });
  }
  next();
};
module.exports = { authMiddleware, workerMiddleware };
