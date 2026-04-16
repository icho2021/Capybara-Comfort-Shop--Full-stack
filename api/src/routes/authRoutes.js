const express = require("express");
const bcrypt = require("bcryptjs");

const { prisma } = require("../lib/prisma");
const { createToken, getCookieOptions } = require("../lib/auth");
const { requireAuth } = require("../middlewares/auth");
const { validateRegisterInput } = require("../validators/authValidators");

const router = express.Router();

// Create a new user with role "user", then issue an auth cookie.
router.post("/register", async (req, res) => {
  try {
    const errors = validateRegisterInput(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Validation failed", fields: errors });
    }

    const email = req.body.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: req.body.name.trim(),
        email,
        passwordHash,
        role: "user",
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const token = createToken(user);
    res.cookie("token", token, getCookieOptions());
    return res.status(201).json({ user });
  } catch {
    return res.status(500).json({ error: "Failed to register user." });
  }
});

// Authenticate credentials and return profile data including role.
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = createToken(user);
    res.cookie("token", token, getCookieOptions());
    return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch {
    return res.status(500).json({ error: "Failed to login." });
  }
});

// Clear auth cookie to end the current session.
router.post("/logout", (_req, res) => {
  const opts = getCookieOptions();
  res.clearCookie("token", {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
  });
  return res.json({ ok: true });
});

// Return current authenticated user for session restore on the client.
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.json({ user });
  } catch {
    return res.status(500).json({ error: "Failed to fetch current user." });
  }
});

module.exports = router;
