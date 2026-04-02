const jwt = require("jsonwebtoken");

const jwtSecret = process.env.JWT_SECRET || "dev-only-secret";

// Create a signed token containing only the user identifier.
function createToken(user) {
  return jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "7d" });
}

// Shared cookie settings for login/register responses.
function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

// Decode and verify an auth token.
function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}

module.exports = { createToken, getCookieOptions, verifyToken };
