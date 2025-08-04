const Worker = require("../models/Worker");
const User = require("../models/User");
const Service = require("../models/Service");
// Complete worker profile
exports.completeWorkerProfile = async (req, res) => {
  try {
    // Parse skills from JSON if necessary
    let skills = req.body.skills;
    if (typeof skills === "string") {
      try {
        skills = JSON.parse(skills);
      } catch (e) {
        console.error("Error parsing skills:", e);
        skills = skills.split(",").map((skill) => skill.trim());
      }
    }
    // Get form data
    const { experience, specialization, availability } = req.body;
    // Find or create worker profile
    let worker = await Worker.findOne({ user: req.user._id });
    if (!worker) {
      worker = new Worker({
        user: req.user._id,
        skills,
        experience: Number(experience),
        specialization,
        availability: availability === "true" || availability === true,
      });
    } else {
      // Update existing worker
      worker.skills = skills || worker.skills;
      worker.experience = Number(experience) || worker.experience;
      worker.specialization = specialization || worker.specialization;
      worker.availability =
        availability === "true" ||
        availability === true ||
        (availability !== "false" &&
          availability !== false &&
          worker.availability);
    }
    // If there's an uploaded profile image, update the user record
    if (req.file) {
      const profileImagePath = `/uploads/profiles/${req.file.filename}`;
      await User.findByIdAndUpdate(req.user._id, {
        profileImage: profileImagePath,
        isProfileCompleted: true,
        firstTimeLogin: false,
      });
    } else {
      await User.findByIdAndUpdate(req.user._id, {
        isProfileCompleted: true,
        firstTimeLogin: false,
      });
    }
    // Save worker profile
    await worker.save();
    res.status(200).json({
      message: "Worker profile updated successfully",
      worker,
    });
  } catch (error) {
    console.error("Error updating worker profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all workers
exports.getAllWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().populate(
      "user",
      "firstName lastName email phone role status profileImage"
    );
    res.status(200).json({ workers });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// my profile
exports.MyWorkerProfile = async (req, res) => {
  try {
    // First find the worker profile where user field matches the logged-in user's ID
    const workerProfile = await Worker.findOne({ user: req.user._id }).populate(
      {
        path: "user",
        select: "-password", // Exclude password from the result
      }
    );
    if (!workerProfile) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }
    res.status(200).json({
      success: true,
      workerProfile,
    });
  } catch (error) {
    console.error("Error retrieving worker profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update availability
exports.updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;

    // Convert availability to boolean
    const isAvailable = availability === "true" || availability === true;

    // Find and update worker's availability
    const worker = await Worker.findOneAndUpdate(
      { user: req.user._id },
      { availability: isAvailable },
      { new: true } // Return the updated document
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      availability: worker.availability,
    });
  } catch (error) {
    console.error("Error updating availability:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update worker data
exports.updateWorkerData = async (req, res) => {
  try {
    // Parse skills from JSON if necessary
    let skills = req.body.skills;
    if (typeof skills === "string") {
      try {
        skills = JSON.parse(skills);
      } catch (e) {
        console.error("Error parsing skills:", e);
        skills = skills.split(",").map((skill) => skill.trim());
      }
    }

    // Get form data
    const { experience, specialization } = req.body;

    // Prepare update object with only provided fields
    const updateData = {};
    if (skills) updateData.skills = skills;
    if (experience) updateData.experience = Number(experience);
    if (specialization) updateData.specialization = specialization;

    // Find and update worker
    const worker = await Worker.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Worker data updated successfully",
      worker,
    });
  } catch (error) {
    console.error("Error updating worker data:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update user data
exports.updateUserData = async (req, res) => {
  try {
    const { firstName, lastName, phone, adress } = req.body;

    // Prepare update object with only provided fields
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (adress) updateData.adress = adress;

    // If profile picture is uploaded, add it to update data
    if (req.file) {
      updateData.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    // Update user data
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, select: "-password" } // Return updated doc without password
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User data updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get full profile information By ID
exports.getWorkerById = async (req, res) => {
  try {
    // Find worker and populate user information
    const worker = await Worker.findOne({ user: req.params.id }).populate(
      "user"
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    // Find all services associated with this worker
    // Find all public services associated with this worker
    const services = await Service.find({
      worker: worker._id,
      audience: "public",
    });

    // Return worker with services
    res.status(200).json({
      worker,
      services,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
