// backend/server.js
import express from "express";
import cors from "cors";
import "dotenv/config";

import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import ridesRouter from "./routes/rides.js";
import healthRouter from "./routes/health.js";
import adminRouter from "./routes/admin.js";
import rideRequestsRouter from "./routes/rideRequests.js";

const app = express();

// CORS — allow your Vite dev server (override with FRONTEND_ORIGIN in .env if needed)
app.use(
  cors({
    origin: [process.env.FRONTEND_ORIGIN || "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"],
  })
);

app.use(express.json());

// Root ping
app.get("/", (_req, res) =>
  res.send("RU-Carpool API is running. Try GET /api/health or /api/users")
);

// Routers
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/rides", ridesRouter);
app.use("/api/admin", adminRouter);

// Mount ride-requests endpoints under /api
// Exposes:
//  - POST   /api/rides/:rideId/requests
//  - GET    /api/ride-requests/mine
//  - GET    /api/rides/:rideId/requests
//  - PATCH  /api/ride-requests/:id
app.use("/api", rideRequestsRouter);

// Optional: 404 + error handlers
app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});