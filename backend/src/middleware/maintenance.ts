let maintenanceEnabled = false;
let maintenanceMessage = "Service under maintenance. Please try again later.";

export const getMaintenanceState = () => ({
  enabled: maintenanceEnabled,
  message: maintenanceMessage,
});

export const setMaintenanceState = (enabled: boolean, message?: string) => {
  maintenanceEnabled = enabled;
  if (typeof message === "string" && message.trim().length > 0) {
    maintenanceMessage = message.trim();
  }
};

// Guard middleware: short-circuit requests when maintenance mode is on.
export const maintenanceGuard = (req: any, res: any, next: any) => {
  if (!maintenanceEnabled) return next();
  // Allow health and maintenance endpoints to continue
  const path = req.path || "";
  if (path.startsWith("/health") || path.startsWith("/internal/maintenance")) {
    return next();
  }
  return res.status(503).json({ error: "Maintenance mode", message: maintenanceMessage });
};
