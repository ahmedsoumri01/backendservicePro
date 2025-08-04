const Worker = require("../models/Worker");

/**
 * Check if a user is eligible for a free trial
 * @route GET /api/subscription/eligible
 * @access Private (Worker only)
 */
exports.isEligibleForFreeTrial = async (req, res) => {
  try {
    const userId = req.user.id; // assuming auth middleware sets req.user

    const worker = await Worker.findOne({ user: userId });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    // Check if free trial has been used
    if (worker.freeTrialInfo.hasUsed) {
      const lastUsed = new Date(worker.freeTrialInfo.lastUsed);
      const now = new Date();
      const daysSinceLastUse = (now - lastUsed) / (1000 * 60 * 60 * 24);

      if (daysSinceLastUse < 7) {
        return res.status(200).json({
          success: true,
          eligible: false,
          message: "Free trial can only be used once every 7 days",
        });
      }
    }

    return res.status(200).json({
      success: true,
      eligible: true,
    });
  } catch (error) {
    console.error("Error checking free trial eligibility:", error);
    res.status(500).json({
      success: false,
      message: "Server error while checking eligibility",
      error: error.message,
    });
  }
};

/**
 * Assign a free trial to the worker
 * @route POST /api/subscription/free-trial
 * @access Private (Worker only)
 */
exports.assignFreeTrial = async (req, res) => {
  try {
    const userId = req.user.id;

    const worker = await Worker.findOne({ user: userId });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + 7);

    worker.subscription = {
      plan: "FreeTrial",
      startDate: now,
      endDate: expirationDate,
      isActive: true,
    };

    worker.freeTrialInfo = {
      hasUsed: true,
      lastUsed: now,
      expirationDate: expirationDate,
    };

    await worker.save();

    res.status(200).json({
      success: true,
      message: "Free trial assigned successfully",
      data: {
        plan: worker.subscription,
        freeTrialInfo: worker.freeTrialInfo,
      },
    });
  } catch (error) {
    console.error("Error assigning free trial:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign free trial",
      error: error.message,
    });
  }
};

/**
 * Assign a paid plan to a worker (for admin/demo use without payment)
 * @route POST /api/subscription/assign-plan
 * @access Private (Admin or internal use)
 * @body { planType: string }
 */
exports.assignPlan = async (req, res) => {
  try {
    const { planType } = req.body;
    const { userId } = req.params; // Or use req.user.id if assigning to self

    // Optional: restrict access based on role
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: "Access denied" });
    // }

    if (!planType) {
      return res.status(400).json({
        success: false,
        message: "Plan type is required",
      });
    }

    const validPlans = [
      "FreeTrial",
      "basicPlan",
      "ProPlan",
      "premiumPlan",
      "DemoAccount",
    ];
    if (!validPlans.includes(planType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan type. Valid options: ${validPlans.join(", ")}`,
      });
    }

    const worker = await Worker.findOne({ user: userId });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + 30);

    // DemoAccount: 10-year validity
    if (planType === "DemoAccount") {
      expirationDate.setFullYear(now.getFullYear() + 10);
    }

    worker.subscription = {
      plan: planType,
      startDate: now,
      endDate: expirationDate,
      isActive: true,
    };

    await worker.save();

    res.status(200).json({
      success: true,
      message: `Plan '${planType}' assigned successfully`,
      data: worker.subscription,
    });
  } catch (error) {
    console.error("Error assigning plan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign plan",
      error: error.message,
    });
  }
};

/**
 * Get current subscription status of the worker
 * @route GET /api/subscription/status
 * @access Private (Worker only)
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const worker = await Worker.findOne({ user: userId });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    if (!worker.subscription || !worker.subscription.plan) {
      return res.status(200).json({
        success: true,
        status: "inactive",
      });
    }

    const now = new Date();
    const isExpired = worker.subscription.endDate < now;

    if (isExpired) {
      // Optionally deactivate subscription
      worker.subscription.isActive = false;
      await worker.save();
    }

    return res.status(200).json({
      success: true,
      status: isExpired ? "expired" : "active",
      plan: worker.subscription.plan,
      startDate: worker.subscription.startDate,
      endDate: worker.subscription.endDate,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving subscription status",
      error: error.message,
    });
  }
};
