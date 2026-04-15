require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const productRoutes = require("./routes/productRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const currencyRoutes = require("./routes/currencyRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = String(process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Configure middleware needed for JSON APIs and cookie-based authentication.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));

// Mount all API routes under /api (review routes before generic /products/:id if paths overlap).
app.use("/api", healthRoutes);
app.use("/api", currencyRoutes);
app.use("/api", authRoutes);
app.use("/api", cartRoutes);
app.use("/api", orderRoutes);
app.use("/api", reviewRoutes);
app.use("/api", productRoutes);
app.use("/api", uploadRoutes);
app.use("/api", settingsRoutes);

// Start the HTTP server.
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
