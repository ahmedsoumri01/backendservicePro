const Worker = require("../models/Worker");

/**
 * Middleware to check if the worker has an active subscription
 * Optionally restricts access based on allowed subscription plans
 *
 * @param {string[]} [requiredPlans] - List of allowed plan names (e.g., ['Pro', 'Premium'])
 *                                   If empty, any active plan passes (including FreeTrial)
 * @returns {Function} Express middleware
 *
 * @example
 * // Allow any active subscription
 * router.get('/feature', subscriptionMiddleware(), handler);
 *
 * @example
 * // Require specific plans
 * router.get('/premium', subscriptionMiddleware(['Premium', 'Pro']), handler);
 */
const subscriptionMiddleware = (requiredPlans = []) => {
  return async (req, res, next) => {
    try {
      // Find worker by authenticated user ID
      const worker = await Worker.findOne({ user: req.user.id });

      if (!worker) {
        return res.status(404).json({
          success: false,
          message: "Worker profile not found.",
        });
      }

      // Check if subscription exists
      if (!worker.subscription || !worker.subscription.plan) {
        return res.status(403).json({
          success: false,
          message:
            "No subscription found. Please subscribe to access this feature.",
        });
      }

      // Check if subscription is active
      if (!worker.subscription.isActive) {
        return res.status(403).json({
          success: false,
          message: "Subscription is inactive.",
        });
      }

      // Check for expiration
      const now = new Date();
      if (worker.subscription.endDate < now) {
        // Optional: auto-deactivate expired subscription
        worker.subscription.isActive = false;
        await worker.save();

        return res.status(403).json({
          success: false,
          message:
            "Your subscription has expired. Please renew to continue access.",
        });
      }

      // If specific plans are required, validate plan type
      if (requiredPlans.length > 0) {
        const currentPlan = worker.subscription.plan;
        if (!requiredPlans.includes(currentPlan)) {
          return res.status(403).json({
            success: false,
            message: `This feature requires one of the following plans: ${requiredPlans.join(
              ", "
            )}. Your current plan: ${currentPlan}.`,
          });
        }
      }

      // All checks passed — proceed
      next();
    } catch (error) {
      console.error("Error in subscription middleware:", error);
      res.status(500).json({
        success: false,
        message: "Server error while verifying subscription.",
        error: error.message,
      });
    }
  };
};

module.exports = { subscriptionMiddleware };
