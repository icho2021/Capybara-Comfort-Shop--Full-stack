require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Configure middleware needed for JSON APIs and cookie-based authentication.
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Mount all Part 2 API routes under /api.
app.use("/api", healthRoutes);
app.use("/api", authRoutes);
app.use("/api", productRoutes);

// Start the HTTP server.
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
