const express = require("express");
const cors = require("cors");
require("dotenv").config();

const healthRoutes = require("./routes/health");
const ridesRoutes  = require("./routes/rides");

const app = express();

// allow local frontend (5173) to call this API
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// mount API routes under /api
app.use("/api", healthRoutes);
app.use("/api", ridesRoutes);

// friendly root
app.get("/", (_req, res) => {
  res.send("RU-Carpool API is running. Try GET /api/health");
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});