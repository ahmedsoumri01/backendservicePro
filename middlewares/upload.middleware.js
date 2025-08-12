const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const createUploadDirectories = () => {
  const dirs = [
    "./uploads",
    "./uploads/profiles",
    "./uploads/services",
    "./uploads/services/images",
    "./uploads/services/videos",
    "./uploads/chat",
    "./uploads/chat/images",
    "./uploads/chat/pdfs",
    "./uploads/chat/others",
  ];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirectories();

// Configure storage for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/profiles");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});
// Storage for chat files (images, pdfs)
const chatFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, "./uploads/chat/images");
    } else if (file.mimetype === "application/pdf") {
      cb(null, "./uploads/chat/pdfs");
    } else {
      cb(null, "./uploads/chat/others");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "chat-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter for chat files (images, pdfs only)
const chatFileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image and PDF files are allowed for chat!"), false);
  }
};

const chatFileUpload = multer({
  storage: chatFileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: chatFileFilter,
});

// Middleware for chat file upload (single file)
exports.uploadChatFile = (req, res, next) => {
  const upload = chatFileUpload.single("file");
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        message: `Error: ${err.message}`,
      });
    }
    // If file was uploaded, add the path and type to the request
    if (req.file) {
      let fileType = null;
      if (req.file.mimetype.startsWith("image/")) fileType = "image";
      else if (req.file.mimetype === "application/pdf") fileType = "pdf";
      else fileType = "other";
      req.body.fileUrl = req.file.path.replace(/\\/g, "/").replace(/^\./, "");
      req.body.fileType = fileType;
    }
    next();
  });
};
// Configure storage for service media (images and videos)
const serviceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store images and videos in separate directories
    if (file.mimetype.startsWith("image/")) {
      cb(null, "./uploads/services/images");
    } else if (file.mimetype.startsWith("video/")) {
      cb(null, "./uploads/services/videos");
    } else {
      cb(null, "./uploads/services");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "service-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to validate image types
const imageFileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// File filter to validate both image and video types
const mediaFileFilter = (req, file, cb) => {
  // Accept image and video files
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed!"), false);
  }
};

// Create multer instances
const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: imageFileFilter,
});

const serviceUpload = multer({
  storage: serviceStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size for videos
  },
  fileFilter: mediaFileFilter,
});

// Middleware for profile image upload
exports.uploadProfileImage = (req, res, next) => {
  const upload = profileUpload.single("profileImage");
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      // An unknown error occurred
      return res.status(500).json({
        success: false,
        message: `Error: ${err.message}`,
      });
    }
    // If file was uploaded, add the path to the request body
    if (req.file) {
      req.body.profileImage = `/uploads/profiles/${req.file.filename}`;
    }
    next();
  });
};

// Middleware for service images upload (multiple)
// Modify the uploadServiceImages middleware to accept the field names used in the frontend
exports.uploadServiceImages = (req, res, next) => {
  // Handle up to 5 images and 2 videos
  const upload = serviceUpload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 2 },
    { name: "newImages", maxCount: 5 }, // Add these fields for update functionality
    { name: "newVideos", maxCount: 2 },
  ]);

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        message: `Error: ${err.message}`,
      });
    }

    // Process uploaded files
    if (req.files) {
      // Process images if any (for create)
      if (req.files.images) {
        const imagePaths = req.files.images.map(
          (file) => `/uploads/services/images/${file.filename}`
        );
        req.body.uploadedImages = imagePaths;
      }

      // Process videos if any (for create)
      if (req.files.videos) {
        const videoPaths = req.files.videos.map(
          (file) => `/uploads/services/videos/${file.filename}`
        );
        req.body.uploadedVideos = videoPaths;
      }

      // Process new images if any (for update)
      if (req.files.newImages) {
        const imagePaths = req.files.newImages.map(
          (file) => `/uploads/services/images/${file.filename}`
        );
        req.body.newUploadedImages = imagePaths;
      }

      // Process new videos if any (for update)
      if (req.files.newVideos) {
        const videoPaths = req.files.newVideos.map(
          (file) => `/uploads/services/videos/${file.filename}`
        );
        req.body.newUploadedVideos = videoPaths;
      }
    }

    next();
  });
};

// Middleware for updating service media (can add or remove)
exports.updateServiceMedia = (req, res, next) => {
  // Use the same upload configuration as for new services
  const upload = serviceUpload.fields([
    { name: "newImages", maxCount: 5 },
    { name: "newVideos", maxCount: 2 },
  ]);

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        message: `Error: ${err.message}`,
      });
    }

    // Process new files
    if (req.files) {
      // Process new images if any
      if (req.files.newImages) {
        const imagePaths = req.files.newImages.map(
          (file) => `/uploads/services/images/${file.filename}`
        );
        req.body.newUploadedImages = imagePaths;
      }

      // Process new videos if any
      if (req.files.newVideos) {
        const videoPaths = req.files.newVideos.map(
          (file) => `/uploads/services/videos/${file.filename}`
        );
        req.body.newUploadedVideos = videoPaths;
      }
    }

    next();
  });
};
