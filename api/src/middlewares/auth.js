const { verifyToken } = require("../lib/auth");
const { prisma } = require("../lib/prisma");

// Reject requests without a valid token cookie and expose userId for handlers.
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// Restrict route access to a specific role, such as "admin".
function requireRole(role) {
  return async (req, res, next) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
