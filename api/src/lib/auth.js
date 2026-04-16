const jwt = require("jsonwebtoken");

const jwtSecret = process.env.JWT_SECRET || "dev-only-secret";

// Create a signed token containing only the user identifier.
function createToken(user) {
  return jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "7d" });
}

// Shared cookie settings for login/register responses.
// Cross-origin deploy (e.g. Vercel + Render): browsers only send cookies on credentialed
// fetch to another site when SameSite=None and Secure=true.
function getCookieOptions() {
  // Render may not always set NODE_ENV=production; RENDER=true is set on Render-hosted services.
  const crossSite = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
  return {
    httpOnly: true,
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

// Decode and verify an auth token.
function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = { createToken, getCookieOptions, verifyToken };
