//server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const connectDB = require("./config/db");
const setupSocket = require("./socket");
const authRoutes = require("./routes/auth.routes");
const { createAdminAccount } = require("./controllers/auth.controller");
const workerRoutes = require("./routes/worker.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const kpiRoutes = require("./routes/kpi.routes");
const serviceRoutes = require("./routes/service.routes");
const reviewRoutes = require("./routes/review.routes");
const reportRoutes = require("./routes/report.routes");
const conversationRoutes = require("./routes/conversation.routes"); // New route
const messageRoutes = require("./routes/message.routes"); // New route
const path = require("path");

// Logger middleware
const { logRequest, logError } = require("./logger");

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = setupSocket(server);

// Make io accessible to routes
app.set("io", io);

// Enable CORS for all requests
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://freelance-heroku.vercel.app",
    ],
    credentials: true,
  })
);

// Log every request
app.use(logRequest);

// Serve static files (profile images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
createAdminAccount();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/conversations", conversationRoutes); // New route
app.use("/api/messages", messageRoutes); // New route
app.use("/api/kpi", kpiRoutes); // New route

// Error logging middleware (should be after all routes)
app.use(logError);

// Define a simple route for testing
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Set the port from environment variables or default to 3001
const PORT = process.env.PORT || 3001;

// Start the server
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
